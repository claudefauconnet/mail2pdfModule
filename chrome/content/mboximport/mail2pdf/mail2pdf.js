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
var exportFileName = "thunderbirdMailsToProcess.js";
var archiveRootDirName = "pdfArchives";

/**
 *
 * init all pathes vars
 *
 *
 *
 */
function initPathes() {

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
    // mailsJsonPath = OS.Path.join(pluginDir, exportFileName);
    mailsJsonPath = OS.Path.join(userDirPath, exportFileName);


}

/**
 *
 *  iterate recursively through messages folders to create the archive tree described in  file mailsJsonPath
 *
 *
 *
 */

function exportfolder() {
    initPathes();

    var mails = "";
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

        var file = new FileUtils.File(filePath);
        var stop = false;

        function recurse(file) {

            var sbdPath = file.path + ".sbd";
            var dirSbd = new FileUtils.File(sbdPath);
            if (dirSbd.exists() && dirSbd.isDirectory()) {
                var items = dirSbd.directoryEntries;
                while (items.hasMoreElements()) {
                    var singlefile = items.getNext();
                    singlefile.QueryInterface(Components.interfaces.nsIFile);
                    if (singlefile.path.indexOf(".msf") < 0)
                        recurse(singlefile, file.leafName);
                }
            }
            else {
                stop = true;
                if (!stop) {
                    return window.alert("archive folder must be a local folder:" + filePath);
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

        let encoder = new TextEncoder();
        let array = encoder.encode(mails);
        let promise = OS.File.writeAtomic(mailsJsonPath, array, {tmpPath: mailsJsonPath + '.tmp'});
        promise.then(
            function (aVal) {
                console.log('successfully saved ' + mailsJsonPath);
                if(true){
                   return  alert("Pour finaliser l'export   exécutez la commande mail2PDF.sh située dans votre dossier personnel")
                }
                runNodeMail2pdf(mailsJsonPath, function (err, result) {
                    console.log("runNode!" + exportFileName)
                })
            },
            function (aReason) {
                console.log('writeAtomic failed for reason:', aReason);
            }
        );


    }


}

/**
 *
 * 1) write in processNodeMail_bat_path the command line to run node with correct parameters
 * 2) run a process with file processNodeMail_bat_path
 *
 *
 *
 * @param exportFileName
 * @param callback
 *
 *
 */


function runNodeMail2pdf(exportFileName, callback) {


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
            // process.run(true, args, args.length);

          if(sep=="/")// linux comand has to run maually)
            alert("List or files ok, please run command exportMailsToPdf.sh located in your user directory");
          OS.File.open(processNodeMail_bat_file).then(function(valOpen)
            {
                var xxx=valOpen;
            })

            ;
            return;
            process.runAsync(args, args.length, function () {
                    observe = function (subject, topic, data) {
                        console.log(subject);
                        console.log(topic);
                        console.log(data);
                    }
                    register = function () {
                        var observerService = Components.classes["@mozilla.org/observer-service;1"]
                            .getService(Components.interfaces.nsIObserverService);
                        observerService.addObserver(this, "myTopicID", false);
                    }
                    unregister = function () {
                        var observerService = Components.classes["@mozilla.org/observer-service;1"]
                            .getService(Components.interfaces.nsIObserverService);
                        observerService.removeObserver(this, "myTopicID");
                    }
                    register();
                },true
            )
            return callback;
        },
        function (aReason) {
            console.log('writeAtomic failed for reason:', aReason);
        }
    );


}



