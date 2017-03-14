
//************************************************************************************************
// MacroManager
//************************************************************************************************

MacroManager = function ()
{
	this.macros = [];
	
	this.getMacrosFolder = function ()
	{
		return Host.Url ("local://$USERCONTENT/Macros", true);
	}

	this.startup = function ()
	{
		// copy factory macros to user folder upon first startup
		let userPath = this.getMacrosFolder ();
		if(!Host.IO.File (userPath).exists ())
			this.copyFactoryMacrosTo (userPath);

		// initial macro scan
		this.rescanAll ();
	}

	this.rescanAll = function ()
	{
		// remove all macros, but keep a temp copy of the array (does not copy the macro objects)
		let oldMacros = this.macros.slice ();
		this.macros.length = 0;
		
		// scan for user macros
		let userPath = this.getMacrosFolder ();		
		this.scanForMacros (userPath);

		// sort by 1.) group, 2.) title
		this.macros.sort (function (a, b) { var r = ccl_compare (a.group, b.group);  return r != 0 ? r : ccl_compare (a.title, b.title); });

		// collect macros, register / update commands
		for(let i in this.macros)
		{
			let macro = this.macros[i];
			let commandName = this.makeCommandName (macro);
			let commandTitle = macro.title;

			// check if a macro with the same id existed before
			if(oldMacros.some (function (element, index, array) { return element.id == macro.id }))
			{
				// update command display name
				let command = Host.GUI.Commands.findCommand (kMacrosCategory, commandName);
				if(command)
					command.displayName = commandTitle;
			}
			else
				Host.GUI.Commands.registerCommand (kMacrosCategory, commandName, JSTRANSLATE ("Macros"), commandTitle);
		}

		// unregister old macros that disappeared
		for(let i in oldMacros)
		{
			let macro = oldMacros[i];
			if(!this.macros.some (function (element, index, array) { return element.id == macro.id }))
			{
				let commandName = this.makeCommandName (macro);
				Host.GUI.Commands.unregisterCommand (kMacrosCategory, commandName);
			}
		}
		
		// emit global signal
		Host.Signals.signal (kMacrosSignal, kMacrosRescanned)
	}
	
	this.copyFactoryMacrosTo = function (userPath)
	{
		let factoryPath = CCL.ResourceUrl ("library", true);		
		let iter = Host.IO.findFiles (factoryPath, "*." + theMacroFileType.extension);
		while(!iter.done ())
		{
			let srcPath = iter.next ();
			
			let destPath = Host.Url (userPath);
			destPath.descend (srcPath.name);
			
			Host.IO.File (srcPath).copyTo (destPath);
		}
	}

	this.scanForMacros = function (folderPath)
	{
		var iter = Host.IO.findFiles (folderPath, "*." + theMacroFileType.extension);
		while(!iter.done ())
		{
			let macroPath = iter.next ();
			
			let macro = new Macro;
			if(macro.loadFromFile (macroPath))
			{
				macro.originalPath = macroPath;

				let fileName = macroPath.name;
				let dotIndex = fileName.lastIndexOf (".");
				fileName = fileName.substring (0, dotIndex);
				macro.id = Host.IO.toBase64 (fileName);
				this.macros.push (macro);
			}
		}
	}
	
	this.buildMenu = function (menu, commandHandler)
	{
		// build groups
		var groups = new Array;
		for(let i in this.macros)
		{
			var macro = this.macros[i];
			var key = macro.group;
			if(groups[key] == undefined)
				groups[key] = new Array;
			groups[key].push (macro);			
		}
		
		let useSubMenu = this.macros.length > 20;
		
		// create sorted list of keys
		var keys = new Array;
		for(let key in groups)
			keys.push (key);
		keys.sort ();
						
		for(let i in keys)
		{
			var key = keys[i];
			
			// sort macros in group alphabetically
			groups[key].sort (function (a, b) { return ccl_compare (a.title, b.title); });
						
			// add header or submenu
			let parentMenu = menu;
			if(key.length > 0)
			{
				if(useSubMenu)
				{
					parentMenu = menu.createMenu ();
					parentMenu.title = key;
					menu.addMenu (parentMenu);
				}
				else
					menu.addHeaderItem (key);
			}

			// add to menu
			for(let i in groups[key])
			{
				var macro = groups[key][i];
				var commandName = this.makeCommandName (macro)
				parentMenu.addCommandItem (macro.title, kMacrosCategory, commandName, commandHandler);
			}
		}
	}

	this.makeCommandName = function (macro)
	{
		return "Macro " + macro.id;
	}

	this.getMacroForCommand = function (commandName)
	{
		let macroID = commandName.substring (6); // "Macro xx"

		for(let i in this.macros)
		{
			var macro = this.macros[i];
			if(macro.id == macroID)
				return macro;
		}
		return null;
	}
}

var theMacroManager = new MacroManager;
