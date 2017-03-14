
//************************************************************************************************
// EventRenamer
//************************************************************************************************

function StringBundle (name)
{
	this.name = name;
	this.strings = [];
}

function EventRenamer ()
{
	this.bundles = [];
	
	this.getNamesFile = function ()
	{
		return Host.Url ("local://$USERCONTENT/Macros/EventNames.txt");
	}
	
	this.startup = function ()
	{
		// copy factory names to user folder upon first startup
		var path = this.getNamesFile ();
		if(!Host.IO.File (path).exists ())
			Host.IO.File (CCL.ResourceUrl ("eventnames.txt")).copyTo (path);
			
		this.reloadAll ();
	}
	
	this.reloadAll = function ()
	{
		this.bundles.length = 0;
	
		var path = this.getNamesFile ();
		return this.loadStrings (path);
	}

	this.loadStrings = function (path)
	{
		var textFile = Host.IO.openTextFile (path);
		if(!textFile)
			return false;
			
		var currentBundle = null;
		while(!textFile.endOfStream)
		{
			var line = textFile.readLine ();
			line = ccl_strtrim (line);
			if(line.length == 0)
				continue;
				
			if(line.charAt (0) == "*") // begin of new bundle
			{
				let name = line.substr (1);
				name = ccl_strtrim (name);
				if(name.length == 0) // error: no bundle name specified!
					continue;
					
				currentBundle = new StringBundle (name);
				this.bundles.push (currentBundle);
			}
			else
			{			
				if(!currentBundle) // error: beginning of bundle missing!
					continue;
					
				currentBundle.strings.push (line);
			}
		}
		
		textFile.close ();		
		return true;	
	}
	
	this.buildMenu = function (menu, commandHandler)
	{
		for(let i in this.bundles)
		{
			var bundle = this.bundles[i];
			
			// create sub menu
			let subMenu = menu.createMenu ()
			subMenu.title = bundle.name;
			menu.addMenu (subMenu);
			
			for(let j in bundle.strings)
			{
				// add menu item for string
				let string = bundle.strings[j];
				if(string.charAt (0) == "-")
				{
					let header = string.substr (1);
					header = ccl_strtrim (header);
					if(header.length == 0)
						subMenu.addSeparatorItem ();
					else
						subMenu.addHeaderItem (header);
				}
				else				
					subMenu.addCommandItem (string, bundle.name, string, commandHandler);
			}
		}
	}
}

var theEventRenamer = new EventRenamer;

//************************************************************************************************
// EventNameEditor
//************************************************************************************************

EventNameEditor.prototype = new CCL.Component ();
function EventNameEditor ()
{	
	this.initialize = function (context)
	{	
		CCL.Component.prototype.initialize.call (this, context);
		
		this.paramList.addString ("text");

		return Host.Results.kResultOk;
	}
	
	this.loadFromFile = function (path)
	{
		let text = "";

		let textFile = Host.IO.openTextFile (path);
		if(textFile)
		{
			let nl = CCL.EndLine (); // use platform line ending
			while(!textFile.endOfStream)
				text += textFile.readLine () + nl; 
			textFile.close ();
		}
		
		this.paramList.lookup ("text").string = text;
	}
	
	this.saveToFile = function (path)
	{
		let text = this.paramList.lookup ("text").string;

		var textFile = Host.IO.createTextFile (path);
		if(textFile)
		{			
			textFile.writeLine (text);
			textFile.close ();
		}
	}

	this.runDialog = function ()
	{
		return Host.GUI.runDialog (this.getTheme (), "EventNameEditor", this);
	}
}
