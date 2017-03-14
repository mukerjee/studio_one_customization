
const kCommandBarFile = "commandbar.xml";

StudioOneMacroPanel.prototype = new CCL.Component (); // inherit from CCL.Component
function StudioOneMacroPanel ()
{
	this.commandHandler = new CommandHandlerDelegate (this);
	this.commandTargets = new Array;
	this.numStaticTargets = 0;

	this.initialize = function (context)
	{	
		// call super class method
		CCL.Component.prototype.initialize.call (this, context);
		
		// get macro manager from service, must not fail!
		this.macroManager = getSharedMacroManager ();
		
		// load event names
		theEventRenamer.startup ();
										
		with(this.paramList)
		{
			addMenu ("renameMenu");
			addMenu ("editMenu");
			addMenu ("setupMenu");
		}
		this.addTarget ("renameMenu", JSTRANSLATE ("Name"))
		this.addTarget ("editMenu", JSTRANSLATE ("Action"))
		this.addTarget ("setupMenu", JSTRANSLATE ("Setup"))

		this.numStaticTargets = this.commandTargets.length
		this.updateMacroTargets ();

		this.macroBar = ccl_new ("CCL:CommandBarModel");
		this.loadCommandBar ();

		// add dependencies
		Host.Signals.advise (kMacrosSignal, this);
		
		return Host.Results.kResultOk;
	}

	this.terminate = function ()
	{
		// remove dependencies
		Host.Signals.unadvise (kMacrosSignal, this);

		let userPath = this.macroManager.getMacrosFolder ();
		userPath.descend (kCommandBarFile);
		this.macroBar.saveToFile (userPath);

		// call super class method
		CCL.Component.prototype.terminate.call (this);
	}

	this.addTarget = function (name, title, icon)
	{
		this.commandTargets.push (this.createTarget (name, title, icon));
	}

	this.createTarget = function (_name, _title, _icon)
	{
		var target = {name: _name, title: _title }
		if(_icon)
		{
			var icon = this.getTheme ().getImage (_icon);
			target.icon = icon;
		}
		return target;
	}
	
	this.updateMacroTargets = function ()
	{
		// remove params and targets before the static ones
		for(let i = 0; i < this.commandTargets.length - this.numStaticTargets; i++)
		{
			let target = this.commandTargets[i];
			this.paramList.remove (target.name);
		}
		this.commandTargets.splice (0, this.commandTargets.length - this.numStaticTargets)

		// add new targets and params before the static ones
		let index = 0;
		for(let i in this.macroManager.macros)
		{
			let macro = this.macroManager.macros[i];
			let commandName = this.macroManager.makeCommandName (macro);
			let title = JSTRANSLATE ("Macros") + "/" + macro.title;

			this.commandTargets.splice (index, 0, this.createTarget (commandName, title, macro.icon));
			this.paramList.addCommand ("Macros", commandName, commandName);
			index++;
		}
	}

	this.loadCommandBar = function ()
	{
		let dataFile = CCL.ResourceUrl (kCommandBarFile);

		// path in user folder
		let userPath = this.macroManager.getMacrosFolder ();
		userPath.descend (kCommandBarFile);

		// copy from resources at first time
		if(!Host.IO.File (userPath).exists ())
			Host.IO.File (dataFile).copyTo (userPath);

		dataFile = userPath;

		this.macroBar.loadFromFile (dataFile);
	}

	this.onCommand = function (category, name)
	{
		// try in active editor
		var activeEditor = this.context.activeEditor;
		if(activeEditor)
			if(activeEditor.interpretCommand (category, name))
				return;
				
		// try global
		Host.GUI.Commands.deferCommand (category, name);
	}
	
	this.executeMacro = function (macro)
	{
		(new MacroExecuter (macro, this.context.activeEditor)).execute ();		
	}
	
	this.onRenameEvents = function (eventName)
	{
		var macro = new Macro;
		
		var c = macro.addCommand ("Event", "Rename Events");
		c.addArgument ("New Name", eventName);
		c.addArgument ("Add numbers", true);
		
		this.executeMacro (macro);
	}
	
	this.onResetToolbar = function ()
	{
	    if(Host.GUI.ask (JSTRANSLATE ("Are you sure you want to revert all changes?")) != Host.GUI.Constants.kYes)
			return;

		// save current state as backup
		let backupPath = this.macroManager.getMacrosFolder ();
		backupPath.descend (kCommandBarFile + ".bak");
		this.macroBar.saveToFile (backupPath);

		// remove file in user folder
		let userPath = this.macroManager.getMacrosFolder ();
		userPath.descend (kCommandBarFile);

		Host.IO.File (userPath).remove ();

		this.loadCommandBar ();
	}

	this.onEditNames = function ()
	{
		var nameEditor = new EventNameEditor;
		nameEditor.initialize ();
		nameEditor.loadFromFile (theEventRenamer.getNamesFile ());
		if(nameEditor.runDialog () == Host.GUI.Constants.kOkay)
		{
			nameEditor.saveToFile (theEventRenamer.getNamesFile ());
			
			theEventRenamer.reloadAll ();
		}
		nameEditor.terminate ();
	}
	
	this.paramChanged = function (param)
	{
	}
	
	this.onExtendMenu = function (param, menu)
	{
		if(param.name == "renameMenu")
		{
			theEventRenamer.buildMenu (menu, new RenameCommandHandler (this));
		}
		else if(param.name == "editMenu")
		{
			this.macroManager.buildMenu (menu, this);
		}
		else if(param.name == "setupMenu")
		{
			menu.addCommandItem (JSTRANSLATE ("Help"), kMacrosCategory, "Help", this);
			menu.addCommandItem (JSTRANSLATE ("Macro Organizer"), "Gadgets", "Macro Organizer"); // handled by macro gadget
			menu.addSeparatorItem ();
			menu.addCommandItem (JSTRANSLATE ("Edit Names"), kMacrosCategory, "Edit Names", this);
			menu.addCommandItem (JSTRANSLATE ("Reload Names"), kMacrosCategory, "Reload Names", this);
			menu.addSeparatorItem ();
			menu.addCommandItem (JSTRANSLATE ("Reset Toolbar"), kMacrosCategory, "Reset Toolbar", this);
		}
	}

	this.checkCommandCategory = function (category)
	{
		return category == kMacrosCategory;
	}
	
	this.interpretCommand = function (msg)
	{
		let result = false;
		switch(msg.name)
		{
		case "Help"         : if(!msg.checkOnly) Host.GUI.Help.showLocation ("studioonemacros"); result = true; break;
		//case "Edit Names" : if(!msg.checkOnly) this.onEditNames (); result = true; break; name editor not finished yet!
		case "Edit Names"	: if(!msg.checkOnly) Host.GUI.openUrl (theEventRenamer.getNamesFile ()); result = true; break;			
		case "Reload Names"	: if(!msg.checkOnly) theEventRenamer.reloadAll (); result = true; break;
		case "Reset Toolbar": if(!msg.checkOnly) this.onResetToolbar (); result = true; break;

		default : // execute macro
			{
				let macro = this.macroManager.getMacroForCommand (msg.name);
				if(macro)
				{
					if(!msg.checkOnly)
						this.executeMacro (macro);
					result = true;
				}
			}
			break;
		}
		return result;
	}

	this.notify = function (subject, msg)
	{
		if(subject == kMacrosSignal && msg.id == kMacrosRescanned)
		{
			this.updateMacroTargets ();
		}
		else
			CCL.Component.prototype.notify.call (this, subject, msg);
	}
}

function RenameCommandHandler (macroPanel)
{
	this.interfaces = [Host.Interfaces.ICommandHandler] 

	// ICommandHandler
	this.checkCommandCategory = function (category)
	{
		return true;
	}
	
	this.interpretCommand = function (msg)
	{
		if(!msg.checkOnly)
			macroPanel.onRenameEvents (msg.name);
		return true;
	}
}

function CommandHandlerDelegate (macroPanel)
{
	this.interfaces = [Host.Interfaces.ICommandHandler] 

	// ICommandHandler
	this.checkCommandCategory = function (category)
	{
		return true;
	}

	this.interpretCommand = function (msg)
	{
		if(!msg.checkOnly)
			macroPanel.onCommand (msg.category, msg.name);
		return true;
	}
}
