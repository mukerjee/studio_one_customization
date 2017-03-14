include_file ("cclapp.js");
include_file ("elements.js");
include_file ("manager.js");

function MacroManagerService ()
{
	this.interfaces = [Host.Interfaces.IComponent, Host.Interfaces.IObserver];
	
	/** Called by panel and gadget to get the shared macro manager instance */
	this.getMacroManager = function ()
	{
		return theMacroManager;
	}		

	// IComponent
	this.initialize = function ()
	{	
		// scan for macros
		theMacroManager.startup ();
		
		// register file handler
		Host.FileTypes.registerHandler (theMacroFileType, theMacroManager.getMacrosFolder (), this);
				
		return Host.Results.kResultOk;
	}
	
	this.terminate = function ()
	{
		// unregister file handler
		Host.FileTypes.unregisterHandler (theMacroFileType);
		
		return Host.Results.kResultOk;
	}	
	
	// IObserver
	this.notify = function (subject, msg)
	{
		if(msg.id == CCL.kOpenFile)
		{
			// open organizer + rescan
			Host.GUI.Commands.interpretCommand ("Gadgets", "Macro Organizer", false, Host.Attributes (new Array ("State", "1")));
			theMacroManager.rescanAll ();
		}
	}
}

//////////////////////////////////////////////////////////////////////////////////////////////////
// Class factory entry point
//////////////////////////////////////////////////////////////////////////////////////////////////

function createInstance (args)
{
	__init (args); // init package identifier

	return new MacroManagerService;
}
