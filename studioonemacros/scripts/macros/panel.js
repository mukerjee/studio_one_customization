
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
            addMenu ("articulationsMenu");
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
        else if(param.name == "articulationsMenu")
        {

            let Longs = menu.createMenu();
            Longs.title = "Longs"
            menu.addMenu(Longs)
            Longs.addCommandItem (JSTRANSLATE ("Generic"), kMacrosCategory, "Macro " + Host.IO.toBase64("Articulations - 001 - Longs - Generic"), this);
            Longs.addCommandItem (JSTRANSLATE ("Alternative"), kMacrosCategory, "Macro " + Host.IO.toBase64("Articulations - 002 - Longs - Alternative"), this);
            Longs.addCommandItem (JSTRANSLATE ("Octave"), kMacrosCategory, "Macro " + Host.IO.toBase64("Articulations - 003 - Longs - Octave"), this);
            Longs.addCommandItem (JSTRANSLATE ("Octave muted"), kMacrosCategory, "Macro " + Host.IO.toBase64("Articulations - 004 - Longs - Octave muted"), this);
            Longs.addCommandItem (JSTRANSLATE ("Small (half)"), kMacrosCategory, "Macro " + Host.IO.toBase64("Articulations - 005 - Longs - Small (half)"), this);
            Longs.addCommandItem (JSTRANSLATE ("Small muted (half muted)"), kMacrosCategory, "Macro " + Host.IO.toBase64("Articulations - 006 - Longs - Small muted (half muted)"), this);
            Longs.addCommandItem (JSTRANSLATE ("Muted (cs, stopped)"), kMacrosCategory, "Macro " + Host.IO.toBase64("Articulations - 007 - Longs - Muted (cs, stopped)"), this);
            Longs.addCommandItem (JSTRANSLATE ("Soft (flautando, hollow)"), kMacrosCategory, "Macro " + Host.IO.toBase64("Articulations - 008 - Longs - Soft (flautando, hollow)"), this);
            Longs.addCommandItem (JSTRANSLATE ("Hard (cuivre, overblown, nasty)"), kMacrosCategory, "Macro " + Host.IO.toBase64("Articulations - 009 - Longs - Hard (cuivre, overblown, nasty)"), this);
            Longs.addCommandItem (JSTRANSLATE ("Harmonic"), kMacrosCategory, "Macro " + Host.IO.toBase64("Articulations - 010 - Longs - Harmonic"), this);
            Longs.addCommandItem (JSTRANSLATE ("Trem (tremolando, flutter)"), kMacrosCategory, "Macro " + Host.IO.toBase64("Articulations - 011 - Longs - Trem (tremolando, flutter)"), this);
            Longs.addCommandItem (JSTRANSLATE ("Trem muted (tremolando, flutter cs, stopped)"), kMacrosCategory, "Macro " + Host.IO.toBase64("Articulations - 012 - Longs - Trem muted (tremolando, flutter cs, stopped)"), this);
            Longs.addCommandItem (JSTRANSLATE ("Trem soft (trem sul tasto)"), kMacrosCategory, "Macro " + Host.IO.toBase64("Articulations - 013 - Longs - Trem soft (trem sul tasto)"), this);
            Longs.addCommandItem (JSTRANSLATE ("Trem hard (flutter overblown, sul pont)"), kMacrosCategory, "Macro " + Host.IO.toBase64("Articulations - 014 - Longs - Trem hard (flutter overblown, sul pont)"), this);
            Longs.addCommandItem (JSTRANSLATE ("Trem muted soft (trem cs sul tasto)"), kMacrosCategory, "Macro " + Host.IO.toBase64("Articulations - 015 - Longs - Trem muted soft (trem cs sul tasto)"), this);
            Longs.addCommandItem (JSTRANSLATE ("Vibrato (molto or vib only)"), kMacrosCategory, "Macro " + Host.IO.toBase64("Articulations - 016 - Longs - Vibrato (molto or vib only)"), this);
            Longs.addCommandItem (JSTRANSLATE ("Higher (bells up, sul tasto)"), kMacrosCategory, "Macro " + Host.IO.toBase64("Articulations - 017 - Longs - Higher (bells up, sul tasto)"), this);
            Longs.addCommandItem (JSTRANSLATE ("Lower (sul pont)"), kMacrosCategory, "Macro " + Host.IO.toBase64("Articulations - 018 - Longs - Lower (sul pont)"), this);
            Longs.addCommandItem (JSTRANSLATE ("Lower muted (cs sul pont)"), kMacrosCategory, "Macro " + Host.IO.toBase64("Articulations - 019 - Longs - Lower muted (cs sul pont)"), this);

            let Legato = menu.createMenu();
            Legato.title = "Legato"
            menu.addMenu(Legato)
            Legato.addCommandItem (JSTRANSLATE ("Generic"), kMacrosCategory, "Macro " + Host.IO.toBase64("Articulations - 020 - Legato - Generic"), this);
            Legato.addCommandItem (JSTRANSLATE ("Alternative"), kMacrosCategory, "Macro " + Host.IO.toBase64("Articulations - 021 - Legato - Alternative"), this);
            Legato.addCommandItem (JSTRANSLATE ("Octave"), kMacrosCategory, "Macro " + Host.IO.toBase64("Articulations - 022 - Legato - Octave"), this);
            Legato.addCommandItem (JSTRANSLATE ("Octave muted"), kMacrosCategory, "Macro " + Host.IO.toBase64("Articulations - 023 - Legato - Octave muted"), this);
            Legato.addCommandItem (JSTRANSLATE ("Small"), kMacrosCategory, "Macro " + Host.IO.toBase64("Articulations - 024 - Legato - Small"), this);
            Legato.addCommandItem (JSTRANSLATE ("Small muted"), kMacrosCategory, "Macro " + Host.IO.toBase64("Articulations - 025 - Legato - Small muted"), this);
            Legato.addCommandItem (JSTRANSLATE ("Muted"), kMacrosCategory, "Macro " + Host.IO.toBase64("Articulations - 026 - Legato - Muted"), this);
            Legato.addCommandItem (JSTRANSLATE ("Soft"), kMacrosCategory, "Macro " + Host.IO.toBase64("Articulations - 027 - Legato - Soft"), this);
            Legato.addCommandItem (JSTRANSLATE ("Hard"), kMacrosCategory, "Macro " + Host.IO.toBase64("Articulations - 028 - Legato - Hard"), this);
            Legato.addCommandItem (JSTRANSLATE ("Harmonic"), kMacrosCategory, "Macro " + Host.IO.toBase64("Articulations - 029 - Legato - Harmonic"), this);
            Legato.addCommandItem (JSTRANSLATE ("Trem"), kMacrosCategory, "Macro " + Host.IO.toBase64("Articulations - 030 - Legato - Trem"), this);
            Legato.addCommandItem (JSTRANSLATE ("Slow (portamento, glissandi)"), kMacrosCategory, "Macro " + Host.IO.toBase64("Articulations - 031 - Legato - Slow (portamento, glissandi)"), this);
            Legato.addCommandItem (JSTRANSLATE ("Fast"), kMacrosCategory, "Macro " + Host.IO.toBase64("Articulations - 032 - Legato - Fast"), this);
            Legato.addCommandItem (JSTRANSLATE ("Slurred (legato runs)"), kMacrosCategory, "Macro " + Host.IO.toBase64("Articulations - 033 - Legato - Slurred (legato runs)"), this);
            Legato.addCommandItem (JSTRANSLATE ("Detache"), kMacrosCategory, "Macro " + Host.IO.toBase64("Articulations - 034 - Legato - Detache"), this);
            Legato.addCommandItem (JSTRANSLATE ("Higher (sul tasto)"), kMacrosCategory, "Macro " + Host.IO.toBase64("Articulations - 035 - Legato - Higher (sul tasto)"), this);
            Legato.addCommandItem (JSTRANSLATE ("Lower (sul pont)"), kMacrosCategory, "Macro " + Host.IO.toBase64("Articulations - 036 - Legato - Lower (sul pont)"), this);

            let Shorts = menu.createMenu();
            Shorts.title = "Shorts"
            menu.addMenu(Shorts)
            Shorts.addCommandItem (JSTRANSLATE ("Generic"), kMacrosCategory, "Macro " + Host.IO.toBase64("Articulations - 040 - Shorts - Generic"), this);
            Shorts.addCommandItem (JSTRANSLATE ("Alternative"), kMacrosCategory, "Macro " + Host.IO.toBase64("Articulations - 041 - Shorts - Alternative"), this);
            Shorts.addCommandItem (JSTRANSLATE ("Very short (spiccato, staccatissimo)"), kMacrosCategory, "Macro " + Host.IO.toBase64("Articulations - 042 - Shorts - Very short (spiccato, staccatissimo)"), this);
            Shorts.addCommandItem (JSTRANSLATE ("Very short soft"), kMacrosCategory, "Macro " + Host.IO.toBase64("Articulations - 043 - Shorts - Very short soft"), this);
            Shorts.addCommandItem (JSTRANSLATE ("Leisurely (longer staccato)"), kMacrosCategory, "Macro " + Host.IO.toBase64("Articulations - 044 - Shorts - Leisurely (longer staccato)"), this);
            Shorts.addCommandItem (JSTRANSLATE ("Octave"), kMacrosCategory, "Macro " + Host.IO.toBase64("Articulations - 045 - Shorts - Octave"), this);
            Shorts.addCommandItem (JSTRANSLATE ("Octave muted"), kMacrosCategory, "Macro " + Host.IO.toBase64("Articulations - 046 - Shorts - Octave muted"), this);
            Shorts.addCommandItem (JSTRANSLATE ("Muted (cs, stopped)"), kMacrosCategory, "Macro " + Host.IO.toBase64("Articulations - 047 - Shorts - Muted (cs, stopped)"), this);
            Shorts.addCommandItem (JSTRANSLATE ("Soft (brushed, feathered)"), kMacrosCategory, "Macro " + Host.IO.toBase64("Articulations - 048 - Shorts - Soft (brushed, feathered)"), this);
            Shorts.addCommandItem (JSTRANSLATE ("Hard (dig)"), kMacrosCategory, "Macro " + Host.IO.toBase64("Articulations - 049 - Shorts - Hard (dig)"), this);
            Shorts.addCommandItem (JSTRANSLATE ("Tenuto"), kMacrosCategory, "Macro " + Host.IO.toBase64("Articulations - 050 - Shorts - Tenuto"), this);
            Shorts.addCommandItem (JSTRANSLATE ("Tenuto soft"), kMacrosCategory, "Macro " + Host.IO.toBase64("Articulations - 051 - Shorts - Tenuto soft"), this);
            Shorts.addCommandItem (JSTRANSLATE ("Marcato"), kMacrosCategory, "Macro " + Host.IO.toBase64("Articulations - 052 - Shorts - Marcato"), this);
            Shorts.addCommandItem (JSTRANSLATE ("Marcato soft"), kMacrosCategory, "Macro " + Host.IO.toBase64("Articulations - 053 - Shorts - Marcato soft"), this);
            Shorts.addCommandItem (JSTRANSLATE ("Marcato hard (bells up)"), kMacrosCategory, "Macro " + Host.IO.toBase64("Articulations - 054 - Shorts - Marcato hard (bells up)"), this);
            Shorts.addCommandItem (JSTRANSLATE ("Marcato longer"), kMacrosCategory, "Macro " + Host.IO.toBase64("Articulations - 055 - Shorts - Marcato longer"), this);
            Shorts.addCommandItem (JSTRANSLATE ("Plucked (pizzicato)"), kMacrosCategory, "Macro " + Host.IO.toBase64("Articulations - 056 - Shorts - Plucked (pizzicato)"), this);
            Shorts.addCommandItem (JSTRANSLATE ("Plucked hard (Bartok)"), kMacrosCategory, "Macro " + Host.IO.toBase64("Articulations - 057 - Shorts - Plucked hard (Bartok)"), this);
            Shorts.addCommandItem (JSTRANSLATE ("Struck (col legno)"), kMacrosCategory, "Macro " + Host.IO.toBase64("Articulations - 058 - Shorts - Struck (col legno)"), this);
            Shorts.addCommandItem (JSTRANSLATE ("Higher (bells up, sul tasto)"), kMacrosCategory, "Macro " + Host.IO.toBase64("Articulations - 059 - Shorts - Higher (bells up, sul tasto)"), this);
            Shorts.addCommandItem (JSTRANSLATE ("Lower (sul pont)"), kMacrosCategory, "Macro " + Host.IO.toBase64("Articulations - 060 - Shorts - Lower (sul pont)"), this);
            Shorts.addCommandItem (JSTRANSLATE ("Harmonic"), kMacrosCategory, "Macro " + Host.IO.toBase64("Articulations - 061 - Shorts - Harmonic"), this);

            let Decorative = menu.createMenu();
            Decorative.title = "Decorative"
            menu.addMenu(Decorative)
            Decorative.addCommandItem (JSTRANSLATE ("Trill min 2nd"), kMacrosCategory, "Macro " + Host.IO.toBase64("Articulations - 070 - Decorative - Trill min 2nd"), this);
            Decorative.addCommandItem (JSTRANSLATE ("Trill maj 2nd"), kMacrosCategory, "Macro " + Host.IO.toBase64("Articulations - 071 - Decorative - Trill maj 2nd"), this);
            Decorative.addCommandItem (JSTRANSLATE ("Trill min 3rd"), kMacrosCategory, "Macro " + Host.IO.toBase64("Articulations - 072 - Decorative - Trill min 3rd"), this);
            Decorative.addCommandItem (JSTRANSLATE ("Trill maj 3rd"), kMacrosCategory, "Macro " + Host.IO.toBase64("Articulations - 073 - Decorative - Trill maj 3rd"), this);
            Decorative.addCommandItem (JSTRANSLATE ("Trill perf 4th"), kMacrosCategory, "Macro " + Host.IO.toBase64("Articulations - 074 - Decorative - Trill perf 4th"), this);
            Decorative.addCommandItem (JSTRANSLATE ("Multitongue"), kMacrosCategory, "Macro " + Host.IO.toBase64("Articulations - 075 - Decorative - Multitongue"), this);
            Decorative.addCommandItem (JSTRANSLATE ("Multitongue muted"), kMacrosCategory, "Macro " + Host.IO.toBase64("Articulations - 076 - Decorative - Multitongue muted"), this);
            Decorative.addCommandItem (JSTRANSLATE ("Synced - 120bpm (trem, trill)"), kMacrosCategory, "Macro " + Host.IO.toBase64("Articulations - 080 - Decorative - Synced - 120bpm (trem, trill)"), this);
            Decorative.addCommandItem (JSTRANSLATE ("Synced - 150bpm (trem, trill)"), kMacrosCategory, "Macro " + Host.IO.toBase64("Articulations - 081 - Decorative - Synced - 150bpm (trem, trill)"), this);
            Decorative.addCommandItem (JSTRANSLATE ("Synced - 180bpm (trem, trill)"), kMacrosCategory, "Macro " + Host.IO.toBase64("Articulations - 082 - Decorative - Synced - 180bpm (trem, trill)"), this);

            let Phrases = menu.createMenu();
            Phrases.title = "Phrases"
            menu.addMenu(Phrases)
            Phrases.addCommandItem (JSTRANSLATE ("FX 1"), kMacrosCategory, "Macro " + Host.IO.toBase64("Articulations - 090 - Phrases - FX 1"), this);
            Phrases.addCommandItem (JSTRANSLATE ("FX 2"), kMacrosCategory, "Macro " + Host.IO.toBase64("Articulations - 091 - Phrases - FX 2"), this);
            Phrases.addCommandItem (JSTRANSLATE ("FX 3"), kMacrosCategory, "Macro " + Host.IO.toBase64("Articulations - 092 - Phrases - FX 3"), this);
            Phrases.addCommandItem (JSTRANSLATE ("FX 4"), kMacrosCategory, "Macro " + Host.IO.toBase64("Articulations - 093 - Phrases - FX 4"), this);
            Phrases.addCommandItem (JSTRANSLATE ("FX 5"), kMacrosCategory, "Macro " + Host.IO.toBase64("Articulations - 094 - Phrases - FX 5"), this);
            Phrases.addCommandItem (JSTRANSLATE ("FX 6"), kMacrosCategory, "Macro " + Host.IO.toBase64("Articulations - 095 - Phrases - FX 6"), this);
            Phrases.addCommandItem (JSTRANSLATE ("FX 7"), kMacrosCategory, "Macro " + Host.IO.toBase64("Articulations - 096 - Phrases - FX 7"), this);
            Phrases.addCommandItem (JSTRANSLATE ("FX 8"), kMacrosCategory, "Macro " + Host.IO.toBase64("Articulations - 097 - Phrases - FX 8"), this);
            Phrases.addCommandItem (JSTRANSLATE ("FX 9"), kMacrosCategory, "Macro " + Host.IO.toBase64("Articulations - 098 - Phrases - FX 9"), this);
            Phrases.addCommandItem (JSTRANSLATE ("FX 10"), kMacrosCategory, "Macro " + Host.IO.toBase64("Articulations - 099 - Phrases - FX 10"), this);
            Phrases.addCommandItem (JSTRANSLATE ("Upwards (rips and runs)"), kMacrosCategory, "Macro " + Host.IO.toBase64("Articulations - 100 - Phrases - Upwards (rips and runs)"), this);
            Phrases.addCommandItem (JSTRANSLATE ("Downwards (falls and runs)"), kMacrosCategory, "Macro " + Host.IO.toBase64("Articulations - 101 - Phrases - Downwards (falls and runs)"), this);
            Phrases.addCommandItem (JSTRANSLATE ("Crescendo"), kMacrosCategory, "Macro " + Host.IO.toBase64("Articulations - 102 - Phrases - Crescendo"), this);
            Phrases.addCommandItem (JSTRANSLATE ("Diminuendo"), kMacrosCategory, "Macro " + Host.IO.toBase64("Articulations - 103 - Phrases - Diminuendo"), this);
            Phrases.addCommandItem (JSTRANSLATE ("Arc"), kMacrosCategory, "Macro " + Host.IO.toBase64("Articulations - 104 - Phrases - Arc"), this);
            Phrases.addCommandItem (JSTRANSLATE ("Slides"), kMacrosCategory, "Macro " + Host.IO.toBase64("Articulations - 105 - Phrases - Slides"), this);

            let Various = menu.createMenu();
            Various.title = "Various"
            menu.addMenu(Various)
            Various.addCommandItem (JSTRANSLATE ("Disco upwards (rips)"), kMacrosCategory, "Macro " + Host.IO.toBase64("Articulations - 110 - Various - Disco upwards (rips)"), this);
            Various.addCommandItem (JSTRANSLATE ("Disco downwards (falls)"), kMacrosCategory, "Macro " + Host.IO.toBase64("Articulations - 111 - Various - Disco downwards (falls)"), this);
            Various.addCommandItem (JSTRANSLATE ("Single string (sul C, G, etc)"), kMacrosCategory, "Macro " + Host.IO.toBase64("Articulations - 112 - Various - Single string (sul C, G, etc)"), this);
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
