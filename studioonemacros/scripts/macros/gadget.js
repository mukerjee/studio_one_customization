include_file ("cclapp.js");
include_file ("elements.js");
include_file ("organizer.js");
include_file ("editor.js");
include_file ("shared.js");

/*
This section will be parsed by String Extractor

BEGIN_XSTRINGS ""

	Strings from classfactory.xml visible to the user
	XSTRING "Macros"
	XSTRING "Macro Organizer"

	Extension Description
	XSTRING "Studio One Macro Toolbar"
	XSTRING "Macro Toolbar inspired by the Studio One beta testers"
	
END_XSTRINGS
*/

//////////////////////////////////////////////////////////////////////////////////////////////////
// Class factory entry point
//////////////////////////////////////////////////////////////////////////////////////////////////

function createInstance (args)
{
	__init (args); // init package identifier

	return new MacroOrganizer;
}
