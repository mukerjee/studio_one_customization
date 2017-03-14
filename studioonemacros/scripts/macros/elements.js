
const kMacrosCategory = "Macros"; // command category for macros

const kMacrosSignal = "studioonemacros";
const kMacrosRescanned = "MacrosRescanned";

//************************************************************************************************
// CommandElement
//************************************************************************************************

const kCommandElement = "CommandElement";

function CommandArgument (name, value)
{
	this.name = name;
	this.value = value;
}

CommandElement = function ()
{
	this.category = "";
	this.name = "";
	this.type = kCommandElement;
	this.arguments = [];
}

CommandElement.prototype.init = function (category, name)
{
	this.category = category;
	this.name = name;
}

CommandElement.prototype.getDisplayString = function ()
{
	// find translated strings for command
	var title = "";
	var command = Host.GUI.Commands.findCommand (this.category, this.name);
	if(command != null)
		title = command.displayCategory + "|" + command.displayName;
	else
		title = this.category + "|" + this.name;
	return title;
}

CommandElement.prototype.getArgumentString = function ()
{
	var string = "";
	for(let i in this.arguments)
		string += this.arguments[i].name + " (\"" + this.arguments[i].value + "\") ";
	return string;
}

CommandElement.prototype.addArgument = function (name, value)
{
	this.arguments.push (new CommandArgument (name, value));
}
			
CommandElement.prototype.createArguments = function ()
{
	var args = null;
	for(let i in this.arguments)
	{
		var a = this.arguments[i];
		if(a.name.length == 0 || a.value.length == 0)
			continue;
			
		if(args == null)
			args = new Array;
		args.push (a.name);
		args.push (a.value);
	}
		
	return args != null ? Host.Attributes (args) : null;
}
	
CommandElement.prototype.setArgumentsFromHost = function (args)
{
	this.arguments.length = 0;
		
	let count = args.countAttributes ();
	for(let i = 0; i < count; i++)
	{
		let name = args.getAttributeName (i);
		let value = args.getAttributeValue (i);
		this.addArgument (name, value);
	}
}

CommandElement.prototype.save = function (xmlNode)
{
	xmlNode.setAttribute ("category", this.category);
	xmlNode.setAttribute ("name", this.name);

	for(let i in this.arguments)		
	{
		var arg = this.arguments[i];
			
		var argNode = xmlNode.newNode ("CommandArgument");
		argNode.setAttribute ("name", arg.name);
		argNode.setAttribute ("value", arg.value);
			
		xmlNode.addChild (argNode);
	}
}
	
CommandElement.prototype.load = function (xmlNode)
{
	this.category = xmlNode.getAttribute ("category");
	this.name = xmlNode.getAttribute ("name");

	var iter = xmlNode.newIterator ();
	while(!iter.done ())
	{
		var argNode = iter.next ();
		if(argNode.name != "CommandArgument")
			continue;
				
		var arg = new CommandArgument (argNode.getAttribute ("name"), argNode.getAttribute ("value"));
		this.arguments.push (arg);
	}
}

//************************************************************************************************
// ElementFactory
//************************************************************************************************

function ElementFactory (xmlNode)
{
	var element = null;
	switch(xmlNode.name)
	{
	case kCommandElement : element = new CommandElement; break;
	}
	
	if(element != null)
		element.load (xmlNode);
		
	return element;
}

//************************************************************************************************
// Macro
//************************************************************************************************

var theMacroFileType = {description: JSTRANSLATE ("Studio One Macro"), extension: "studioonemacro", mimetype: "application/x-presonus-studioonemacro"};

Macro = function ()
{
	this.title = "";
	this.group = "";
	this.description = "";
	this.id = "";
	this.elements = [];
	this.originalPath = null;
}

Macro.prototype.addElement = function (element)
{
	this.elements.push (element);
}
	
Macro.prototype.addCommand = function (category, name)
{
	var element = new CommandElement;
	element.init (category, name);
	this.elements.push (element);
	return element;
}

Macro.prototype.loadFromFile = function (path)
{
	var xmlTree = Host.IO.XmlTree ();
	if(!xmlTree.loadFromFile (path))
	{
		var msg = JSTRANSLATE ("Loading Macro failed:");
		msg += "\n" + path.name;
		msg += "\n\n" + xmlTree.errorMessage;
		Host.GUI.alert (msg);
		return false;
	}
					
	var root = xmlTree.root;		
	if(root.name != "Macro")
		return false;
			
	this.title = root.getAttribute ("title");
	this.group = root.getAttribute ("group");
	this.description = root.getAttribute ("description");
			
	var iter = root.newIterator ();
	while(!iter.done ())
	{
		var element = ElementFactory (iter.next ());
		if(element != null)
			this.elements.push (element);
	}
		
	return true;
}

Macro.prototype.saveToFile = function (path)
{
	var xmlTree = Host.IO.XmlTree ();
		
	var root = xmlTree.root;
	root.name = "Macro";
	root.setAttribute ("title", this.title);
	root.setAttribute ("group", this.group);
	root.setAttribute ("description", this.description);
			
	for(let i in this.elements)
	{
		var element = this.elements[i];
		var node = root.newNode (element.type);
		element.save (node);
		root.addChild (node);
	}
		
	return xmlTree.saveToFile (path);
}
	
Macro.prototype.save = function ()
{
	return this.saveToFile (this.originalPath);
}

//************************************************************************************************
// MacroExecuter
//************************************************************************************************

MacroExecuter = function (macro, defaultHandler)
{
	this.execute = function ()
	{
		for(let i in macro.elements)
		{
			var element = macro.elements[i];
			switch(element.type)
			{
			case kCommandElement : this.onCommand (element); break;
			}
		}
	}
		
	this.onCommand = function (element)
	{
		var args = element.createArguments ();
		
		// try default handler first
		if(defaultHandler != null)
			if(defaultHandler.interpretCommand (element.category, element.name, false, args))
				return;
		
		// try as global command directed to active workspace frame
		Host.GUI.Commands.interpretCommand (element.category, element.name, false, args);
	}
}