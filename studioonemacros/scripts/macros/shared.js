const kMacroServiceClassID = "{F556BEC2-8B97-4387-9DE5-87C74670A1B5}";

function getSharedMacroManager ()
{
	return Host.Services.getInstance (kMacroServiceClassID).getMacroManager ();
}
