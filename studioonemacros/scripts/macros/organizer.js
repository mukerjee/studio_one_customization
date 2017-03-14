
MacroOrganizer.prototype = new CCL.Component ();
function MacroOrganizer ()
{	
	this.initialize = function (context)
	{	
		CCL.Component.prototype.initialize.call (this, context);
		
		// get macro manager from service, must not fail!
		this.macroManager = getSharedMacroManager ();

		this.paramList.addParam ("new");
		this.paramList.addParam ("edit");
		this.paramList.addParam ("delete");		
		this.paramList.addParam ("refresh");
		this.paramList.addParam ("showFolder");
		
		// create model for file list
		this.fileList = ccl_new ("Host:ListViewModel");
		this.fileList.columns.addColumn (200, JSTRANSLATE ("Name"), CCL.Columns.kTitleID, 50, CCL.Columns.kSizable|CCL.Columns.kCanFit);
		this.fileList.columns.addColumn (200, JSTRANSLATE ("Group"), "group", 50, CCL.Columns.kSizable|CCL.Columns.kCanFit);
		this.fileList.columns.addColumn (200, JSTRANSLATE ("Description"), "description", 100, CCL.Columns.kSizable|CCL.Columns.kCanFit);
		this.updateFileList ();

		// add dependencies
		Host.Signals.advise (this.fileList, this);
		Host.Signals.advise (kMacrosSignal, this);
		
		return Host.Results.kResultOk;
	}
	
	this.terminate = function ()
	{
		// remove dependencies
		Host.Signals.unadvise (this.fileList, this);
		Host.Signals.unadvise (kMacrosSignal, this);
	
		return CCL.Component.prototype.terminate.call (this);
	}
	
	this.updateFileList = function ()
	{
		this.fileList.removeAll ();
		
		// create list of macros sorted by group/title
		var sortedMacros = new Array;
		for(let i in this.macroManager.macros)
			sortedMacros.push (this.macroManager.macros[i]);
		sortedMacros.sort (function (a, b) { let result = ccl_compare (a.group, b.group); return result ? result : ccl_compare (a.title, b.title); });
		
		for(let i in sortedMacros)
		{
			let macro = sortedMacros[i];
	
			let item = this.fileList.newItem (macro.title);
			item.details.group = macro.group;
			item.details.description = macro.description;
			item.details.data = macro; // keep reference to macro object
			this.fileList.addItem (item);
		}
		
		this.fileList.changed ();
	}
	
	this.runDialog = function ()
	{
		return Host.GUI.runDialog (this.getTheme (), "MacroOrganizer", this);
	}

	this.paramChanged = function (param)
	{
		switch(param.name)
		{
		case "new"		: this.onNewMacro (); break;
		case "edit"		: this.onEditMacro (this.fileList.getFocusItem ()); break;
		case "delete"	: this.onDeleteMacros (); break;
		case "refresh"	: this.onRefresh (); break;		
		case "showFolder" : this.onShowFolder (); break;
		}	
	}
	
	this.notify = function (subject, msg)
	{
		if(subject == kMacrosSignal)
		{
			if(msg.id == kMacrosRescanned)
				this.updateFileList ();
		}
		else if(msg.id == CCL.kItemOpened)
		{
			if(subject == this.fileList)
				this.onEditMacro (msg.getArg (0));				
		}
		else
			CCL.Component.prototype.notify.call (this, subject, msg);
	}
	
	this.onRefresh = function ()
	{
		this.macroManager.rescanAll ();
	}
	
	this.onShowFolder = function ()
	{
		Host.GUI.showInBrowser (this.macroManager.getMacrosFolder ());
	}
	
	this.onNewMacro = function ()
	{
		var editor = new MacroEditor;
		editor.initialize ();

		if(editor.runDialog () == Host.GUI.Constants.kOkay)
		{
			let macro = editor.getMacro ();
			
			if(macro.title.length == 0)
				macro.title = JSTRANSLATE ("User Macro");
			
			let fileName = CCL.LegalFileName (macro.title + "." + theMacroFileType.extension);
			
			let path = this.macroManager.getMacrosFolder ();
			path.descend (fileName);
			path.makeUnique ();
			
			macro.saveToFile (path);
			
			this.onRefresh ();
		}
		
		editor.terminate ();				
	}

	this.onEditMacro = function (item)
	{
		if(item == null)
			return;
			
		var macro = item.details.data;
		
		var editor = new MacroEditor;
		editor.initialize ();
		
		editor.setMacro (macro);
					
		if(editor.runDialog () == Host.GUI.Constants.kOkay)
		{
			let newMacro = editor.getMacro ();
			newMacro.originalPath = macro.originalPath;
						
			newMacro.save ();
			
			this.onRefresh ();
		}
		
		editor.terminate ();				
	}
	
	this.onDeleteMacros = function ()
	{
		var candidates = this.fileList.getSelectedItems ();
		if(candidates.length == 0)
			return;
			
		if(Host.GUI.ask (JSTRANSLATE ("Do you want to delete the selected macros?")) != Host.GUI.Constants.kYes)
			return;
			
		var iter = candidates.newIterator ();
		while(!iter.done ())
		{
			var item = iter.next ();
			var macro = item.details.data;
			Host.IO.File (macro.originalPath).remove ();
		}
		
		this.onRefresh ();
	}
}