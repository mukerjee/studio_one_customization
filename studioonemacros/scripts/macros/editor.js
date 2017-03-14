
MacroEditor.prototype = new CCL.Component ();
function MacroEditor ()
{	
	this.initialize = function (context)
	{	
		CCL.Component.prototype.initialize.call (this, context);
		
		// create command selector
		this.commandSelector = ccl_new ("CCL:CommandSelector");
		this.commandSelector.name = "commandSelector";
		this.commandSelector.argColumnEnabled = true;
		this.commandSelector.addExcludedCategory (JSTRANSLATE ("Macros")); // filter out macros for now
		this.children.push (this.commandSelector);
		
		// create parameters
		this.paramList.addParam ("add");
		this.paramList.addParam ("remove");
		this.paramList.addParam ("moveUp");
		this.paramList.addParam ("moveDown");
		this.paramList.addParam ("edit");
						
		this.paramList.addString ("title");
		this.paramList.addString ("group");
		this.paramList.addString ("description");
		
		// create model for macro list
		this.macroList = ccl_new ("Host:ListViewModel");
		this.macroList.columns.addColumn (200, JSTRANSLATE ("Command"), CCL.Columns.kTitleID, 50, CCL.Columns.kSizable|CCL.Columns.kCanFit);
		this.macroList.columns.addColumn (300, JSTRANSLATE ("Arguments"), "arguments", 50, CCL.Columns.kSizable|CCL.Columns.kCanFit);
		
		// add dependencies
		Host.Signals.advise (this.macroList, this);
		Host.Signals.advise (this.commandSelector, this);
				
		return Host.Results.kResultOk;
	}
	
	this.terminate = function ()
	{
		// remove dependencies
		Host.Signals.unadvise (this.commandSelector, this);
		Host.Signals.unadvise (this.macroList, this);
	
		return CCL.Component.prototype.terminate.call (this);
	}
	
	this.setMacro = function (macro)
	{
		this.paramList.lookup ("title").string = macro.title;
		this.paramList.lookup ("group").string = macro.group;
		this.paramList.lookup ("description").string = macro.description;
		
		this.macroList.removeAll ();
		for(let i in macro.elements)
		{
			var element = macro.elements[i];

			// create ListViewItem for macro element
			if(element.type == kCommandElement)
			{
				var macroItem = this.macroList.newItem (element.getDisplayString ()); 
				macroItem.details.arguments = element.getArgumentString ();
				macroItem.details.data = element; // keep reference to CommandElement
				
				this.macroList.addItem (macroItem);
			}
		}
		
		this.macroList.changed ();
	}
	
	this.getMacro = function ()
	{
		var macro = new Macro ();
		macro.title = this.paramList.lookup ("title").string;
		macro.group = this.paramList.lookup ("group").string;
		macro.description = this.paramList.lookup ("description").string;
		
		var count = this.macroList.itemCount;
		for(let i = 0; i < count; i++)
		{
			var item = this.macroList.getItem (i);
			var element = item.details.data;
			macro.addElement (element);
		}
		
		return macro;
	}

	this.runDialog = function ()
	{
		return Host.GUI.runDialog (this.getTheme (), "MacroEditor", this);
	}
	
	this.paramChanged = function (param)
	{
		switch(param.name)
		{
		case "add"		: this.addCommandToMacro (this.commandSelector.focusCommand); break;
		case "remove"	: this.removeCommandsFromMacro (); break;
		case "moveUp"	: this.moveMacroItems (-1); break;
		case "moveDown"	: this.moveMacroItems (+1); break;
		case "edit"		: this.editMacroItem (this.macroList.getFocusItem ()); break;
		}	
	}
	
	this.notify = function (subject, msg)
	{
		if(msg.id == CCL.kItemOpened)
		{
			if(subject == this.macroList)
				this.editMacroItem (msg.getArg (0));				
		}
		else if(msg.id == CCL.kCommandSelected)
		{
			this.addCommandToMacro (msg.getArg (0));
		}
		else
			CCL.Component.prototype.notify.call (this, subject, msg);
	}
	
	this.addCommandToMacro = function (command)
	{
		var changed = false;
		if(command)
		{
			// create CommandElement
			var element = new CommandElement;
			element.category = command.category;
			element.name = command.name;
			
			// check for arguments
			var arguments = command.arguments;
			if(arguments.length > 0 && arguments != "...")
			{
				var args = new Array;
				args = arguments.split (",");
				for(let i in args)
					element.arguments.push (new CommandArgument (ccl_strtrim (args[i]), ""));
			}

			// create ListViewItem for CommandElement
			var macroItem = this.macroList.newItem (element.getDisplayString ());
			macroItem.details.arguments = element.getArgumentString ();
			macroItem.details.data = element; // keep reference to CommandElement
						
			// add item to list model
			this.macroList.addItem (macroItem);		
			changed = true;
		}
		
		if(changed)
		{
			this.macroList.changed (); // make changes visible in ListView
			
			var listView = this.macroList.itemView;
			if(listView != null)
				listView.setFocusItem (this.macroList.itemCount-1, true); // focus last item
		}
	}
	
	this.removeCommandsFromMacro = function ()
	{
		// remove selected items from list model		
		var candidates = this.macroList.getSelectedItems ();
		var iter = candidates.newIterator ();
		var changed = !iter.done ();
		while(!iter.done ())
			this.macroList.removeItem (iter.next ());
	
		if(changed)
		{
			this.macroList.changed (); // make changes visible in ListView

			var listView = this.macroList.itemView;
			if(listView != null && this.macroList.itemCount > 0)
				listView.setFocusItem (this.macroList.itemCount-1, true); // focus last item
		}
	}
	
	this.moveMacroItems = function (offset)
	{
		var listView = this.macroList.itemView; // get ListView attached to model
		if(listView == null)
			return;

		// get focused item
		var focusIndex = listView.getFocusItem ();
		var macroItem = this.macroList.getItem (focusIndex);
		if(macroItem == null)
			return;
	
		// move item in model
		this.macroList.removeItem (macroItem);
		var position = focusIndex + offset;
		this.macroList.insertItem (position, macroItem);
			
		this.macroList.changed ();
		listView.setFocusItem (position, true); // focus and select in ListView
	}
	
	this.editMacroItem = function (macroItem)
	{
		if(macroItem == null)
			return;
			
		var element = macroItem.details.data;			
		if(element.type != kCommandElement)
			return;
			
		let done = false;
		
		if(1) // EXPERIMENTAL: use edit task window for argument editing
		{
			let command = Host.GUI.Commands.findCommand (element.category, element.name);
			if(command && command.arguments == "..." && command.classID.length > 0)
			{
				let argumentEditor = ccl_new ("Host:EditTaskArgumentUI");
				let args = element.createArguments ();
				if(args == null)
					args = Host.Attributes ();
				
				if(!argumentEditor.runDialog (args, command.classID))
					return;

				element.setArgumentsFromHost (args);
				done = true;
			}
		}

		if(!done)
		{
			if(element.arguments.length < 1)
			{
				Host.GUI.alert (JSTRANSLATE ("This command does not have any arguments."));
				return;
			}
					
			// run dialog for editing arguments
			var params = ccl_new ("CCL:ParamList");
			for(let i in element.arguments)
				params.addString (element.arguments[i].name).string = element.arguments[i].value;			
			
			if(Host.GUI.runDialogWithParameters (params, JSTRANSLATE ("Command Arguments")) != Host.GUI.Constants.kOkay)
				return;

			for(let i in element.arguments)
				element.arguments[i].value = params.lookup (element.arguments[i].name).string;
		}
			
		// update argument string
		macroItem.details.arguments = element.getArgumentString ();
		this.macroList.invalidate (); // better: this.macroList.itemView.invalidateItem (index)
	}
}
