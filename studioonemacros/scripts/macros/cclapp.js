//************************************************************************************************
//
// Crystal Class Library
// Copyright (c)2011 PreSonus Software Ltd.
//
// Filename    : cclapp.js
// Created by  : Matthias Juwan
// Description : Utilities for JavaScript Extensions
//
//************************************************************************************************

/** Function to serve as CCL namespace. */
function CCL () 
{}

/** Shorcut to create instance via Plug-in Manager. */
function ccl_new (className)
{
	return Host.Classes.createInstance (className);
}

/** Remove leading and trailing whitespaces. */
function ccl_strtrim (s)
{
	return s.replace (/^\s+|\s+$/g,'');
}

/** Compare function, returns 1/-1/0. */
function ccl_compare (a, b)
{
	return a < b ? -1 : a > b ? 1 : 0;
}

/** Get platform line ending. */
CCL.EndLine = function ()
{
	switch(Host.getPlatform ())
	{
	case "win" : return "\r\n";
	case "mac" : return "\r";
	}
	return "\n";
}

/** Shortcut to alert box. */
function alert (message)
{
	Host.GUI.alert (message);
}

//////////////////////////////////////////////////////////////////////////////////////////////////
// Package Helpers
//////////////////////////////////////////////////////////////////////////////////////////////////

/** Package identifier. */
var kPackageID = "";

/** Script initialization function. */
function __init (args)
{
	kPackageID = args.packageInfo.getAttribute ("Package:ID");
}

/** Helper function to construct a resource URL. */
CCL.ResourceUrl = function (fileName, isFolder)
{
	return Host.Url ("package://" + kPackageID + "/resources/" + fileName, isFolder);
}

/** Helper function to make a legal file name. */
CCL.LegalFileName = function (fileName)
{
	let regExp = new RegExp ('[,/\:*?""<>|]', 'g');
	return fileName.replace (regExp, "_");
}

/** Translate key string => JSTRANSLATE is parsed by String Extractor. */
function JSTRANSLATE (key)
{
	var theStrings = Host.Locales.getStrings (kPackageID);
	if(theStrings == null) // no translation table loaded
		return key;
	return theStrings.getString (key);
}

//////////////////////////////////////////////////////////////////////////////////////////////////
// Constants
//////////////////////////////////////////////////////////////////////////////////////////////////

CCL.Columns = 
{
	kIconID: "icon", 			// ListViewModel::kIconID
	kTitleID: "title", 			// ListViewModel::kTitleID
	kCheckBoxID: "check", 		// ListViewModel::kCheckBoxID
	
	// IColumnHeaderList::ColumnFlags
	kSizable: 1<<0,
	kMoveable: 1<<1,
	kCanFit: 1<<5
};

CCL.kExtendMenu = "extendMenu"; // IParameter::kExtendMenu
CCL.kItemOpened = "itemOpened"; // ListViewModel::kItemOpened
CCL.kCommandSelected = "commandSelected"; // CommandSelector::kCommandSelected
CCL.kOpenFile = "openFile"; // IFileHandler::kOpenFile

//************************************************************************************************
// Component
/** Basic GUI component definition. */
//************************************************************************************************

CCL.Component = function ()
{
	this.interfaces = [Host.Interfaces.IObjectNode, 
					   Host.Interfaces.IComponent, 
					   Host.Interfaces.IController, 
					   Host.Interfaces.IParamObserver,
					   Host.Interfaces.IObserver,
					   Host.Interfaces.ICommandHandler];
}

CCL.Component.prototype.getTheme = function ()
{
	return Host.GUI.Themes.getTheme (kPackageID);
}

// IComponent
CCL.Component.prototype.initialize = function (context)
{
	// create parameter list
	this.paramList = ccl_new ("CCL:ParamList");
	this.paramList.controller = this;
	
	// remember context
	this.context = context;
	
    // create child array (IObjectNode)
	this.children = [];
	
	return Host.Results.kResultOk;
}

CCL.Component.prototype.terminate = function ()
{
	// cleanup
	this.paramList.controller = 0; // list holds a reference to our stub object!
	this.paramList = 0;
	this.context = 0;
	
	this.children.length = 0; // remove all children (Note: native object are still kept by garbage collector!)
	
	return Host.Results.kResultOk;
}

// IParamObserver
CCL.Component.prototype.paramChanged = function (param)
{
}

// IObserver
CCL.Component.prototype.notify = function (subject, msg)
{
	if(msg.id == CCL.kExtendMenu) // sent by menu parameters
	{
		var menu = msg.getArg (0);
		this.onExtendMenu (subject, menu);
	}
}

CCL.Component.prototype.onExtendMenu = function (param, menu)
{
}

// ICommandHandler
CCL.Component.prototype.checkCommandCategory = function (category)
{
	return false;
}

CCL.Component.prototype.interpretCommand = function (msg)
{
	return false;
}
