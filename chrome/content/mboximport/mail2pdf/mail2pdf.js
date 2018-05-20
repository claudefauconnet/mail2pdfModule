Components.utils.import("resource://gre/modules/NetUtil.jsm");
Components.utils.import("resource://gre/modules/FileUtils.jsm");
Components.utils.import("resource://gre/modules/osfile.jsm");


var pluginDir = null;
var sep = null;
var mailsJsonPath = null;
var modulePath = null;
var nodePath = null;
var processNodeMail_bat_path = null;
var mail2PdfNodeInitPath = null;
var userDirPath = null;



function exportMail2pdf() {

    console.log("mail2pdf")
    exportfolder();
}

var mail2PdfNodeInitJsName = "mail2PdfNodeInit.js"
var exportFileName = "EXPORT_MAILS_TO_PDF.json";
var archiveRootDirName = "pdfArchives";


function initPathes() {
    /*  Components.utils.import("resource://gre/modules/FileUtils.jsm");
      path = FileUtils.getFile("Home", ["test.xxx"]).path;*/
    // find directory separator type


    /*console.log(OS.Constants.Path.libxul)
    console.log(OS.Constants.Path.profileDir)
    console.log(OS.Constants.Path.homeDir)
    console.log(OS.Constants.Path.desktopDir)
    console.log(OS.Constants.Path.winAppDataDir)
    console.log(OS.Constants.Path.winLocalAppDataDir)
    console.log(OS.Constants.Path.winStartMenuProgsDir)
    console.log(OS.Constants.Path.macUserLibDir)
    console.log(OS.Constants.Path.macLocalApplicationsDir)*/
    userDirPath = OS.Constants.Path.homeDir;
    Components.utils.import("resource://gre/modules/AddonManager.jsm");
    AddonManager.getAddonByID("mail2pdf@souslesens", function (addon) {
        var uri = addon.getResourceURI("install.rdf");
        if (uri instanceof Components.interfaces.nsIFileURL) {
            var file = uri.file;
            modulePath = file.parent.path;
            if (modulePath.indexOf("\\") > -1)
                sep = "\\";
            else
                sep = "/";

            nodePath = OS.Path.join(modulePath, "nodeJS");
            var mail2pdfDir = OS.Path.join(modulePath, "chrome/content/mboximport/mail2pdf/");
            if (sep == "\\")
                mail2pdfDir = mail2pdfDir.replace(/\//g, sep);

            processNodeMail_bat_path = OS.Path.join(mail2pdfDir, "processNodeMail.bat")
            mail2PdfNodeInitPath = OS.Path.join(mail2pdfDir, "mail2PdfNodeInit.js")

        }
    });


    pluginDir = OS.Path.join(OS.Constants.Path.profileDir, "sessionstore.js");
    if (pluginDir.search(/\\/) != -1)
        sep = "\\";
    else
        sep = "/"
    pluginDir = pluginDir.substring(0, pluginDir.indexOf("sessionstore.js")).replace(/\\/g, "/") + "pdfArchives";
    mailsJsonPath = OS.Path.join(pluginDir, exportFileName);


}


function exportfolder() {
    initPathes();

    var mails = "";
    var rootDirName="";
    //var archiveRootDir=  fileWriter.getLocalDirectory(archiveRootDirName).path.replace(/\\/g,"/");
    var archiveRootDir = pluginDir + archiveRootDirName;
    var folders = GetSelectedMsgFolders();


    for (var i = 0; i < folders.length; i++) {
        var isVirtualFolder = folders[i] ? folders[i].flags & 0x0020 : false;
        if ((i > 0 && folders[i].server.type != lastType) || (folders.length > 1 && isVirtualFolder)) {
            alert(mboximportbundle.GetStringFromName("noFolderExport"));
            return;
        }
        var lastType = folders[i].server.type;
    }


    for (var i = 0; i < folders.length; i++) {
        var file = msgFolder2LocalFile(folders[i]);
        var filePath = file.path;


        //    folderName = folderName.replace(/[\\:?"\*\/<>#]/g, "_");
        //   folderName = folderName.replace(/[\x00-\x19]/g, "_");
        var file = new FileUtils.File(filePath);


        function recurse(file) {
            var dirSbd = new FileUtils.File(file.path + ".sbd");
            if (dirSbd.exists() && dirSbd.isDirectory()) {
                var items = dirSbd.directoryEntries;
                while (items.hasMoreElements()) {
                    var singlefile = items.getNext();
                    singlefile.QueryInterface(Components.interfaces.nsIFile);
                    if (singlefile.path.indexOf(".msf") < 0)
                        recurse(singlefile, file.leafName);
                }
            }
            if (file.isFile()) {
                var mail = {
                    //   content: data,
                    fileName: file.leafName,
                    path: file.path
                }
                mails += (JSON.stringify(mail) + ",\n");
            }
        }

        mails += "{\"archiveRootDir\":\"" + file.leafName + "\",\n\"emlFiles\":[\n"
        recurse(file);

        mails = mails.substring(0, mails.length - 2) + "]}";


        let encoder = new TextEncoder();                                   // This encoder can be reused for several writes
        let array = encoder.encode(mails);
        // var writePath = OS.Path.join(pluginDir, exportFileName);// Convert the text to an array
        let promise = OS.File.writeAtomic(mailsJsonPath, array, {tmpPath: mailsJsonPath + '.tmp'});
        promise.then(
            function (aVal) {
                console.log('successfully saved ' + mailsJsonPath);
                runNodeMail2pdf(mailsJsonPath, function (err, result) {
                    console.log("runNode!" + exportFileName)
                })
            },
            function (aReason) {
                console.log('writeAtomic failed for reason:', aReason);
            }
        );
        /*fileWriter.writeFile("exportToPdf",exportFileName,mails);
 /*  var nodeStartDir= fileWriter.getLocalDirectory("exportToPdf").path;
     copyNodeInitFile();
     runNodeMail2pdf("exportToPdf"+"/"+exportFileName,nodeStartDir, function (err, result) {
         console.log("runNode!" + exportFileName)
     })*/


    }


}

/*function copyNodeInitFile(){


// get the "data.txt" file in the profile directory

    var xx=file;


    var file = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsIFile);
    file.initWithPath(".mail2PdfNodeInit.js");

    var file2 = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsIFile);
    var destination=fileWriter.getLocalDirectory("exportToPdf").path+"\\processNodeMail.exe"
    file2.initWithPath(destination);
    file.copyTo(destination, "mail2PdfNodeInit.js");

}*/

function runNodeMail2pdf(exportFileName, callback) {
    //generation od init js file for node inlcuding location of this file
    /*  fileWriter.writeFile("exportToPdf","processNodeMail.exe","node "+nodeStartDir+"mail2PdfNodeInit.js");
      var mail2PdfNodeInitPath=fileWriter.getLocalDirectory("exportToPdf").path+"\\processNodeMail.exe"
        var file = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsIFile);

     // file.initWithPath("D:\\GitHub\\mail2pdfModule\\chrome\\content\\mboximport\\mail2pdf\\processNodeMail.bat");
      file.initWithPath(mail2PdfNodeInitPath);*/

// write jsonFile path in .bat

    let encoder = new TextEncoder();
    var text = "cd .\nnode " + mail2PdfNodeInitPath + " " + mailsJsonPath + " " + userDirPath + "\npause";
    let array = encoder.encode(text);
    let promise = OS.File.writeAtomic(processNodeMail_bat_path, array, {tmpPath: processNodeMail_bat_path + '.tmp'});
    promise.then(
        function (aVal) {
            var processNodeMail_bat_file = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsIFile);
            processNodeMail_bat_file.initWithPath(processNodeMail_bat_path);

            var process = Components.classes["@mozilla.org/process/util;1"].createInstance(Components.interfaces.nsIProcess);
            process.init(processNodeMail_bat_file);
            //    var args = [exportFileName,userDirPath];
            var args = [];
            process.run(true, args, args.length)
            return callback;
        },
        function (aReason) {
            console.log('writeAtomic failed for reason:', aReason);
        }
    );


}



