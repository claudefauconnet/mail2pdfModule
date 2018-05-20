/**
 * Created by claud on 24/11/2017.
 */
/*******************************************************************************
 * mailArchiver_ATD LICENSE************************
 *
 * The MIT License (MIT)
 *
 * Copyright (c) 2017 Claude Fauconnet claude.fauconnet@neuf.fr
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 ******************************************************************************/


var archiveProcessor = (function () {
        var self = {}
        var WINDOWS_1252 = '\u0000\u0001\u0002\u0003\u0004\u0005\u0006\u0007\b\t\n\u000b\f\r\u000e\u000f\u0010\u0011\u0012\u0013\u0014\u0015\u0016\u0017\u0018\u0019\u001a\u001b\u001c\u001d\u001e\u001f !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~€�‚ƒ„…†‡ˆ‰Š‹Œ�Ž��‘’“”•–—˜™š›œ�žŸ ¡¢£¤¥¦§¨©ª«¬­®¯°±²³´µ¶·¸¹º»¼½¾¿ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖ×ØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõö÷øùúûüýþÿ';

        self.totalCountMails = 0;
        self.totalCountUploadedMails = 0;
        self.totalPdfSaved = 0;
        self.dirCountMails = 0;
        self.messageText = "";
        self.sender;
        self.currentNumberOfLevels = 0;
        self.maxLevels = 3;
        self.mailMaxSize = 500;
        self.currentDirName = "";
        self.stopAsync = null;
        self.currentLang = "FR;"

        self.totalCountMailsWithAttachements = 0;
        self.currentAction;
        self.dirStatus = {};
        self.parentDirSubDirsNames = [];
        self.message = "";
        self.pendingRecursive = 0;
        self.logFile;
        self.doProcessing = false;
        var currentDirSubjects = {};
        self.logTimer;
        self.maxArchiveSize = 50000000;
        self.stopOnTooBigFile = true;
        self.message2 = "";

        var fs = require('fs');
        var path = require('path');
        var async = require("async");
        var process = require("process");

        // var emlformat = require('eml-format');
        var simpleParser = require('mailparser').simpleParser;
        var windows1252 = require('windows-1252');


        var attachmentTypes = [];
        var countErrors = 0;
        var countTextAttachment = 0;
        var logContent = "";


        var messageIds = []

        var ws;
        self.setWebSocket = function () {
            const WebSocket = require('ws');

            const wss = new WebSocket.Server({port: 8080});

            wss.on('connection', function connection(ws) {
                ws.on('message', function incoming(message) {
                    console.log('received: %s', message);
                    setMessage(message, "orange")
                });

                ws.send('something');
            });

            ws = new WebSocket('ws://localhost:8080');

            ws.on('open', function open() {
                ws.send('something');
            });

            ws.on('message', function incoming(data) {
                console.log(data);
            });
        }
        self.removePdfDirs = function (sender) {
            var root = self.getPdfArchivePath(archiveRootDir);
            root = root.substring(root.lastIndexOf(path.sep) + 1)
            root = root.substring(0, root.lastIndexOf("."));
            var rootDir = path.resolve("./pdfArchives/" + sender + "/" + self.getDayDate() + "/" + root)
            if (fs.existsSync(rootDir)) {
                try {
                    util.removeDirRecursive(rootDir);
                    fs.mkdirSync(rootDir);
                    self.logFile = rootDir + path.sep + "archiveProcessor.consoleToFile"
                }
                catch (e) {
                    archiveProcessor.consoleToFile(e);
                }
            }
        }


        self.getDayDate = function () {
            var date = new Date();
            return date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + (date.getDate());
        }
        self.getPdfArchivePath = function (apath) {
            if (!archiveRootDir)
                return "";
            var rootParent = archiveRootDir.substring(0, archiveRootDir.lastIndexOf(path.sep));
            var str = apath.substring(rootParent.length + 1);

            return str;

        }
        self.consoleToFile = function (message) {
            return console.log(message);
            if (typeof message === "object")
                message = JSON.stringify(message, null, 2);

            logContent += message + "\n";
            /*   self.logTimer = setInterval(function () {
                   fs.appendFile(self.logFile, logContent, function (err) {
                       archiveProcessor.consoleToFile(err);
                   })
               }, 1000)*/
        }


        self.traverseFileTree = function (apath, traverseFileCallback) {
            self.pendingRecursive++;
            self.message2 = self.pendingRecursive;
            var rootPath = apath;
            var pathes = []
            var index = 0;
            var p = rootPath.length;
            var firstFnLine = 0;

            if (self.stopAsync != null)
                return;// traverseFileCallback(self.stopAsync);

            if (fs.lstatSync(apath).isFile()) {
                setMessage(self.message += "<br>" + "...");
                var fileSize = fs.statSync(apath).size
                archiveProcessor.consoleToFile("Archive size MO:" + Math.round(fileSize.length / 1000000));

                // ws.send("Archive size MO:"+Math.round(fileSize.length/1000000)+"  "+apath)
                if (fileSize > self.maxArchiveSize) {
                    var message = "<b>Archive size TOO BIG MO:" + Math.round(fileSize / 1000000) + "</b> file " + apath;
                    setMessage(self.message += "<br>" + message)
                    if (self.stopOnTooBigFile)
                        return traverseFileCallback(null);
                    else {
                        self.message += message + "<br>";
                        return self.onEndTraverserse(null);
                    }
                }

                messageIds = []
                var fileName = path.basename(apath);

                if (false) {
                    console.log("---------UTF8  :" + fs.readFileSync(apath, 'utf8'))
                    console.log("---------binary  :" + fs.readFileSync(apath, {encoding: "binary"}))
                    return self.onEndTraverserse(null);
                }


                if (true) {
                    var emlContent = "" + fs.readFileSync(apath, 'utf8')
                }
                else {
                    var buffer = fs.readFileSync(apath, {encoding: "binary"});
                    emlContent = "" + buffer;

                }
                emlContent = emlContent.replace(/[\r]+.*/gm, "");
                var mailsContent = self.splitEml(emlContent);


                archiveProcessor.consoleToFile("------------" + apath + " : " + mailsContent.length + " emails");

                self.totalCountMails += mailsContent.length;
                var pathShort = self.getPdfArchivePath(apath);
                var message = resources.Message_dirProcessing[self.currentLang] + self.getPdfArchivePath(apath) + " " + mailsContent.length + " emails";

                self.message += "<br>" + message;
                // archiveProcessor.consoleToFile("---------" + JSON.stringify(process.memoryUsage()));

                async.eachSeries(mailsContent, function (mailContent, eachCallBack) {
                    if (mailContent.indexOf("charset=windows-1252") > -1) {
                        var xx = "aa";


                        function fromWindows1252(binaryString) {
                            var text = '';

                            for (var i = 0; i < binaryString.length; i++) {
                                text += WINDOWS_1252.charAt(binaryString.charCodeAt(i));
                            }

                            return text;
                        }

                        mailContent = fromWindows1252(mailContent);


                    }
                    var mail = {
                        content: mailContent,
                        fileName: fileName,
                        path: pathShort
                    }


                    self.processMail(mail, function (err, result) {
                        if (err) {
                            archiveProcessor.consoleToFile(err);
                            return eachCallBack(err);
                        }
                        eachCallBack(null);
                        setMessage(self.message);

                    })


                }, function (err) {

                    self.onEndTraverserse(err);


                })
                // });

            }


            else if (fs.lstatSync(apath).isDirectory()) {
                var files = fs.readdirSync(apath, 'utf8');
                if (self.currentAction = "checkRules") {
                    self.checkRuleFileAnDirAtSameLevel(files, function (err) {
                        if (err) {
                            self.stopAsync = err;
                            traverseFileCallback(err);
                        }
                    });
                    self.checkRuleMaxDirLevels(files, function (err) {
                        if (err) {
                            self.stopAsync = err;
                            traverseFileCallback(err);
                        }
                    });

                }

                // for each dir of a level

                async.eachSeries(files, function (file, callbackEach) {
                    var subPath = apath + path.sep + file;
                    self.traverseFileTree(subPath, function (err, result) {
                        if (err) {
                            return callbackEach(err)
                        }
                        callbackEach(null);
                    });
                    callbackEach();

                }, function (err) {
                    self.onEndTraverserse(err);
                })


            }
        }

        self.onEndTraverserse = function (err, result) {
            if (err) {
                self.pendingRecursive = 0;
                self.stopAsync = true;
                return onFinishProcessing(err);
            }
            self.pendingRecursive -= 1;
            //  archiveProcessor.consoleToFile(self.pendingRecursive);
            if (self.pendingRecursive <= 0) {
                self.pendingRecursive = 0;
                //  archiveProcessor.consoleToFile("countTextAttachment :"+  self.totalCountUploadedMails);
                archiveProcessor.consoleToFile(JSON.stringify(attachmentTypes, null, 2));
                archiveProcessor.consoleToFile("totalCountUploadedMails :" + self.totalCountUploadedMails);
                archiveProcessor.consoleToFile("parseErrors :" + countErrors);
                archiveProcessor.consoleToFile("countTextAttachment :" + countTextAttachment);
                archiveProcessor.consoleToFile("totalPdfSaved :" + archiveProcessor.totalPdfSaved);


                onFinishProcessing();


            }
        }


        self.processMail = function (mail, callback) {
            //  var eml= self.decodeEml(mail.content);
            var eml = mail.content;
            simpleParser(eml, {}, function (err, data) {

                //  emlformat.read(mail.content, function (err, data) {
                if (err) {
                    archiveProcessor.consoleToFile("!!!!!!!!!!!!!!" + err);
                    countErrors += 1 //  return setMessage(self.message += "<br>" + resources.Exception_emlFileNotInBase64[self.currentLang] + "  " + err);
                    return callback(err);
                }


                //  var messageId = data.headers["Message-ID"];
                var messageId = data.messageId;
                if (false && messageIds.indexOf(messageId) > -1)
                    return callback();
                messageIds.push(messageId);


                var sender = self.sender;
                var date = new Date();
                var senderDirDate = date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + (date.getDate());

                if (self.doProcessing) {
                    mailPdfGeneratorSimpleParser.createMailPdf(data, mail.fileName, mail.path, sender, senderDirDate, function (error, result) {

                        if (error) {
                            archiveProcessor.consoleToFile(error);
                            setMessage(self.message += "<br>" + resources.Exception_uploadFailed[self.currentLang] + data.title + " id " + data.messageId)
                            callback();

                        }

                        self.totalCountUploadedMails += 1;
                        if (self.totalCountUploadedMails % 10 == 0)
                            setMessage(self.message += "<br>" + self.totalCountUploadedMails)
                        callback();


                    })

                } else {
                    callback();
                }
            });


        }


        self.checkRules = function (event, item, callback) {
            callback(null);
        };


        self.splitEml = function (emlContent) {

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

        }
        self.decodeEml = function (emlContent) {
            if (emlContent.indexOf('windows-1252') > -1) {
                return windows1252.decode(emlContent);
            }
            return emlContent;
        }

//************************************rules*******************************************
//   a sbd dir cannot be in the same dir than a eml file with the same name
        self.checkRuleFileAnDirAtSameLevel = function (files, callback) {
            var hasDir = false;
            var hasMails = false;
            var subDirNames = [];

            for (var i = 0; i < files.length; i++) {

                var name = path.basename(files[i]);
                var p = name.indexOf(".sbd");
                if (p > -1) {//dir
                    self.parentDirSubDirsNames.push(name.substring(0, p))
                    //   subDirNames.push(name.substring(0, p));
                }

                else {//emlFile
                    if (self.parentDirSubDirsNames.indexOf(name) > -1)
                        return callback(resources.Exception_fileAnDirAtSameLevel[self.currentLang] + " : " + files[i])

                }

            }

            //  self.parentDirSubDirsNames=[];
            return callback(null);


        }

        self.checkRuleMaxDirLevels = function (files, callback) {
            var p = -1
            for (var i = 0; i < files.length; i++) {
                p = i;
                if (path.basename(files[i]).indexOf(".sbd") > -1)//dir
                    self.currentNumberOfLevels += 1
                break;
            }

            if (self.currentNumberOfLevels >= self.maxLevels)
                return callback(resources.Exception_maxLevelsExceeded[self.currentLang] + " : " + files[p].name)
            return callback(null);


        }

        self.addMessage = function (message, type) {
            if (!type)
                type = "";
            else
                type += " : "
            $("#message").append("<br>" + type + message);
        }


        self.hashCode = function (s) {
            return s.split("").reduce(function (a, b) {
                a = ((a << 5) - a) + b.charCodeAt(0);
                return a & a
            }, 0);
        }


        self.decodeBuffer = function (buffer) {
            var latinChars = ['Á', 'Â', 'Ã', 'Ä', 'Å', 'Æ', 'Ç', 'È', 'É', 'Ê', 'Ë', 'Ì', 'Í', 'Î', 'Ï', 'Ð', 'Ñ', 'Ò', 'Ó', 'Ô', 'Õ', 'Ö', '×', 'Ø', 'Ù', 'Ú', 'Û', 'Ü', 'Ý', 'Þ', 'ß', 'à', 'á', 'â', 'ã', 'ä', 'å', 'æ', 'ç', 'è', 'é', 'ê', 'ë', 'ì', 'í', 'î', 'ï', 'ð', 'ñ', 'ò', 'ó', 'ô', 'õ', 'ö', '÷', 'ø', 'ù', 'ú', 'û', 'ü', 'ý', 'þ', 'ÿ'];

            for (var i = 0; i < buffer.length; i++) {
                if (buffer[i] > 192) {

                    return buffer.toString('binary');

                }
            }
            return buffer.toString('utf8');

        }

        self.decodeBufferOld = function (buffer) {
            var iconv = require('iconv-lite');

            var index = 0
            var isLatin = false
            for (var i = 0; i < buffer.length; i++) {
                if (buffer[i] == 233) {//é
                    isLatin = true;
                    index = i;
                    break;

                }
            }
            var encoding = "UTF8";
            var str = "";
            if (isLatin) {
                str = iconv.decode(buffer, 'ISO-8859-1');
                var xxxx = str.substring(i, i + 100);
                console.log(xxxx)

            } else {
                str = "" + buffer;
            }
            return str;
        }


        return self;

    }
)
()

if (false) {
// archiveProcessor.pendingRecursive++;
    archiveProcessor.traverseFileTree("C:\\Users\\claud\\Downloads\\ATD2\\jacques.sbd\\00-Arrivee\\", function (err, result) {
        var xx = err;
    })
}
/*function setMessage(){

}*/


/* self.processMailSimpleParser = function (mail, callback) {
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

          var messageId = data.headers["Message-ID"];
          if(messageId.indexOf("<a4c5a6f9-a380-a7eb-6c06-25b01bbe44ab")>-1){
              var xx=1;
          }
          if (false && messageIds.indexOf(messageId) > -1)
              return callback();
          messageIds.push(messageId);


          var sender = self.sender;


          if (self.doProcessing) {


              mailPdfGenerator.createMailPdf(data, mail.fileName, mail.path, sender, self.getDayDate(), function (error, result) {

                  if (error) {
                      archiveProcessor.consoleToFile(error);
                      setMessage(self.message += "<br>" + resources.Exception_uploadFailed[self.currentLang])
                      callback();

                  }

                  self.totalCountUploadedMails += 1;
                  callback();


              })
          } else {
              callback();
          }


      });
  }*/