var path = require("path");
var fs = require("fs");

var modulesDir='../../../../nodeJS/node_modules/'
console.log("---modulesDir----"+path.resolve(modulesDir));
var simpleParser = require(modulesDir+'mailparser').simpleParser;
var async = require(modulesDir+"async");
//var xxx = path.resolve(__dirname, "mailPdfGenerator.js");
var mailPdfGenerator = require("./mailPdfGeneratorSimpleParser.js");


mailProcessor = {
    totalCountMails: 0,
    messageIds: [],
    processMails: function (file,targetPdfPath) {

        //  var file = dir + path.sep + "EXPORT_MAILS_TO_PDF.json";
        var dataStr =""+ fs.readFileSync(file);
        var json = JSON.parse( dataStr);

        var archiveRootDir = json.archiveRootDir;
        var data = json.emlFiles;

        for (var i = 0; i < data.length; i++) {


            var emlObj = data[i];
            var emlFileContent = "" + fs.readFileSync(emlObj.path);
            var relativePath = emlObj.path.substring(archiveRootDir.length + 1)

            emlFileContent = emlFileContent.replace(/[\r]+.*/gm, "");
            var mailContents = mailProcessor.splitEml(emlFileContent);

            var RootDirPosition = emlObj.path.indexOf(archiveRootDir);
            var relativePath = emlObj.path.substring(RootDirPosition);
            var pdfDir=targetPdfPath;//emlObj.path.substring(0,RootDirPosition-1);
            mailProcessor.totalCountMails += mailContents.length;
            //   var message = resources.Message_dirProcessing[self.currentLang] + self.getPdfArchivePath(apath) + " " + mailsContent.length + " emails";
            async.eachSeries(mailContents, function (mailContent, callbackAsync) {


                var mail = {
                    content: mailContent,
                    pdfDirRelativePath: relativePath,
                    pdfDir:pdfDir
                }

                mailProcessor.processMail(mail, function (err, result) {
                    if (err) {
                        return callbackAsync(null);
                    }
                    var x = result;
                    callbackAsync(null);
                })
            }, function (err) {
                console.log("done");
            })

        }


    },


    processMail: function (mail, callback) {
        //  var eml= self.decodeEml(mail.content);
        var eml = mail.content;
        // var simpleParser = require("mailparser").simpleParser;
        simpleParser(eml, {}, function (err, parsedMail) {
            if (err) {
                archiveProcessor.consoleToFile("!!!!!!!!!!!!!!" + err);
                countErrors += 1 //  return setMessage(self.message += "<br>" + resources.Exception_emlFileNotInBase64[self.currentLang] + "  " + err);
                return callback(err);
            }


            //  var messageId = data.headers["Message-ID"];
            var messageId = parsedMail.messageId;
            if (false && messageIds.indexOf(messageId) > -1)
                return callback();
            mailProcessor.messageIds.push(messageId);


            var sender = "archives_emails_ATD";
            var date = new Date();
            var senderDirDate = date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + (date.getDate());
            //  console.log(JSON.stringify(data,null,2))
            if (true && messageId) {
                mailPdfGenerator.createMailPdf(parsedMail, mail.pdfDir, mail.pdfDirRelativePath,  sender, senderDirDate, function (error, result) {

                    if (error) {
                        // archiveProcessor.consoleToFile(error);
                        callback(error)
                        /*     setMessage(self.message += "<br>" + resources.Exception_uploadFailed[self.currentLang] + data.title + " id " + data.messageId)
                             callback();*/

                    }

                    /*  self.totalCountUploadedMails += 1;
                      if (self.totalCountUploadedMails % 10 == 0)
                          setMessage(self.message += "<br>" + self.totalCountUploadedMails)*/
                    callback(null, "done");


                })

            } else {
                callback(null, "");
            }
        });
    },

    processMailSimpleParser: function (mail, callback) {
        simpleParser(mail.content, {}, function (err, data) {
            if (err) {
                archiveProcessor.consoleToFile("!!!!!!!!!!!!!!" + err);
                countErrors += 1 //  return setMessage(self.message += "<br>" + resources.Exception_emlFileNotInBase64[self.currentLang] + "  " + err);
                return callback(err);
            }


            if (data.attachments) {
                if (!data.text) {

                    var xx = 1;
                    if (!data.html)
                        var xx = 2;
                }

                for (var i = 0; i < data.attachments.length > 0; i++) {
                    if (data.attachments[i].contentType) {
                        var contentType = data.attachments[i].contentType.split(";")[0]
                        var attchType = (data.text ? true : false) + ";" + (data.html ? true : false) + ";" + contentType;
                        if (attachmentTypes.indexOf(attchType) < 0)
                            attachmentTypes.push(attchType);

                        if (data.attachments[i].name) {
                            //  archiveProcessor.consoleToFile(data.attachments[i].name)

                        }
                    }
                    else {
                        countTextAttachment += 1;
                        // archiveProcessor.consoleToFile();
                        if (data.attachments[i].data) {
                            data.text = data.attachments[i].data;
                            //  archiveProcessor.consoleToFile("YYYYYY no contentType " + mail.path + "/" + mail.fileName)
                            //  delete data.attachments[i];+mail.fil
                        }
                        else
                            ;///  archiveProcessor.consoleToFile("ZZZZZZ no contentType " + mail.path + "/" + mail.fileName)

                    }
                }
            }
            else if ((!data.text) && (!data.html)) {
                ;// archiveProcessor.consoleToFile("XXXXXXXXXXXXX" + mail.path + "/" + data.headers["Message-ID"]);
            }

            /*   var messageId = data.headers["Message-ID"];
               if(messageId.indexOf("<a4c5a6f9-a380-a7eb-6c06-25b01bbe44ab")>-1){
                   var xx=1;
               }
               if (false && messageIds.indexOf(messageId) > -1)
                   return callback();
               messageIds.push(messageId);*/


            var sender = "aaa";//self.sender;


            if (true) {


                mailPdfGenerator.createMailPdf(data, mail.fileName, mail.path, sender, mailProcessor.getDayDate(), function (error, result) {

                    if (error) {

                        callback();

                    }

                    mailProcessor.totalCountUploadedMails += 1;
                    callback();


                })
            } else {
                callback();
            }


        });
    }
    , splitEml: function (emlContent) {

        var mails = []
        var start = 0, end = 0;
        var start = emlContent.indexOf("X-Mozilla-Status: 0001");
        while ((end = emlContent.indexOf("X-Mozilla-Status: 0001", start + 1)) > -1) {
            var mail = emlContent.substring(start, end);
            start = end;
            mails.push(mail);


        }
        if (end < 0)//last
            mails.push(emlContent.substring(start));
        return mails;

    }, decodeEml: function (emlContent) {
        if (emlContent.indexOf('windows-1252') > -1) {
            return windows1252.decode(emlContent);
        }
        return emlContent;
    }

    , getDayDate: function () {
        var date = new Date();
        return date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + (date.getDate());
    },
    getPdfArchivePath: function (apath) {
        if (!archiveRootDir)
            return "";
        var rootParent = archiveRootDir.substring(0, archiveRootDir.lastIndexOf(path.sep));
        var str = apath.substring(rootParent.length + 1);

        return str;

    },
    log: function (message) {
        console.log(message);
    }
}
module.exports=mailProcessor;

//mailProcessor.processMails("C:\\Users\\claud\\AppData\\Roaming\\Thunderbird\\Profiles\\lb11cn7x.default\\exportToPdf\\EXPORT_MAILS_TO_PDF.json")