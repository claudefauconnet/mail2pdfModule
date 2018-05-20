Components.utils.import("resource://gre/modules/osfile.jsm");

var fileWriter=(function(){
self={};








self.getLocalDirectory = function(dirName) {
   /* let sessionstore = OS.Path.join(OS.Constants.Path.profileDir, "sessionstore.js");
    let encoder = new TextEncoder();                                   // This encoder can be reused for several writes
    let array = encoder.encode("This is some text");                   // Convert the text to an array
    let promise = OS.File.writeAtomic("file.txt", array,               // Write the array atomically to "file.txt", using as temporary
        {tmpPath: "file.txt.tmp"});*/

    let directoryService = Cc["@mozilla.org/file/directory_service;1"].getService(Ci.nsIProperties);
    let localDir = directoryService.get("ProfD", Ci.nsIFile);
    localDir.append(dirName);
    if (!localDir.exists() || !localDir.isDirectory())
        localDir.create(Ci.nsIFile.DIRECTORY_TYPE, 774);
    return localDir;
},

    self.writeFile= function(dirName,fileName,data) {
    let myFile = self.getLocalDirectory(dirName);
    myFile.append(fileName);
    if ( true || myFile.exists() == false )
        try {
            myFile.create(Ci.nsIFile.NORMAL_FILE_TYPE, 774);
        }
        catch(e){
        console.log(e);
        }
    Components.utils.import("resource://gre/modules/NetUtil.jsm");
    Components.utils.import("resource://gre/modules/FileUtils.jsm");
    var ostream = FileUtils.openSafeFileOutputStream(myFile)
    var converter = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"].
    createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
    converter.charset = "UTF-8";
    var istream = converter.convertToInputStream(data);
    NetUtil.asyncCopy(istream, ostream, function(status) {
        if (!Components.isSuccessCode(status))
            return null;
        return myFile.path;
    });
},

    self.readFile=function(fileName) {
    let myFile = self.getLocalDirectory();
    myFile.append(fileName);
    if (myFile.exists() == false)
        myFile.create(Ci.nsIFile.NORMAL_FILE_TYPE, 774);
    var data = "";
    var fstream = Components.classes["@mozilla.org/network/file-input-stream;1"].createInstance(Components.interfaces.nsIFileInputStream);
    var cstream = Components.classes["@mozilla.org/intl/converter-input-stream;1"].createInstance(Components.interfaces.nsIConverterInputStream);
    fstream.init(myFile, -1, 0, 0);
    cstream.init(fstream, "UTF-8", 0, 0);
   /* let (str = {}) {
        let read = 0;
        do {
            read = cstream.readString(0xffffffff, str);
            data += str.value;
        } while (read != 0);
    }*/
    cstream.close();
    return data;
}

return self;
}())