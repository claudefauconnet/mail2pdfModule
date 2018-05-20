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




var mailManager = (function () {
    var fs = require('fs');
    var multer = require('multer');
    var path = require('path');
    var converter = require('json-2-csv');
    var extract = require('extract-zip')
    var simpleParser = require('mailparser').simpleParser;
    const Entities = require('html-entities').XmlEntities;
    var zipdir = require('zip-dir');

    const entities = new Entities();

  //  var mailPdfGenerator = require('./mailPdfGenerator.js');

    var uploadDir = path.normalize( "uploads");
    var self = {};

    self.processEML = function (eml, fileName, fullPath, sender, callback) {

        simpleParser(eml, {}, function (err, mail) {
            if (err)
                return callback(err);
            var mail2 = mail;
            // archiveProcessor.consoleToFile(JSON.stringify(mail,null,2))
            //  archiveProcessor.consoleToFile(fullPath + "   " + mail.subject + "  " + mail.date);
            var date = new Date();
            if (mail.subject) {
                mail.subject = entities.decode(mail.subject);
            }
            if (mail.text) {
                mail.text = entities.decode(mail.text);
            }
            if (mail.html) {
                mail.html = entities.decode(mail.html);
            }
            if (mail.textAsHtml) {
                mail.textAsHtml = entities.decode(mail.textAsHtml);
            }

            var senderDirDate = date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + (date.getDate())
            mailPdfGenerator.createMailPdf(mail, fileName, fullPath, sender, senderDirDate, function (err, result) {

                if (err)
                    return callback(err);

                var obj = {
                    sender: sender,
                    path: result.path,
                    file: result.file,
                    messageId: mail.messageId
                }

                if (mail.from)
                    obj.from = mail.from.text;
                if (mail.to)
                    obj.to = mail.to.text;
                if (mail.subject)
                    obj.subject = mail.subject;
                if (mail.date)
                    obj.date = mail.date;
                if (mail.text)
                    obj.textSize = mail.text.length;
                else
                    obj.textSize = 0
                if (mail.html)
                    obj.htmlSize = mail.html.length;
                else
                    obj.htmlSize = 0
                if (mail.textAsHtml)
                    obj.textAsHtml = mail.textAsHtml.length;
                else
                    obj.textAsHtml

             /*   localDB.store(obj, function (err, result) {
                    if (err) {
                        archiveProcessor.consoleToFile(err);
                        return callback(err);
                    }*/

                    callback(null, "ok")
                })

            })



    }


    self.findMails = function (query, format, callback, response) {
        var xxx = query;
        var sender;
        if (!format)
            format = "count";
        else {
            sender = query.sender;
            delete query.format;
        }

        if (format == "downloadPdfs") {
            if (!sender) {
                return callback("a sender is needed");
            }

            var path = "./public/pdfArchives/" + sender;

            zipdir(path, function (err, buffer) {
                // `buffer` is the buffer of the zipped file
                if (err)
                    return callback(err);

                response.setHeader('Content-type', 'application/zip');
                response.setHeader("Content-Disposition", "attachment;filename=archive.zip");
                response.send(buffer);
            });


        }
        else {

            //    archiveProcessor.consoleToFile(JSON.stringify(query));
            localDB.find(query, function (err, result) {
                if (err)
                    return callback(err);

                var ouput = "";
                if (format == 'count') {
                    return callback(null, result.length + " mails");
                }
                if (format == 'json') {
                    return callback(null, result);
                }
                if (format == 'csv') {
                    var str = "";
                    var keys = [];
                    var sep = "\t"
                    for (var i = 0; i < result.length; i++) {
                        for (var key in result[i]) {
                            if (keys.indexOf(key) < 0)
                                keys.push(key)

                        }

                    }

                    for (var j = 0; j < keys.length; j++) {

                        str += keys[j] + sep
                    }
                    str += key + '\n';
                    var regex = new RegExp("/" + sep + "/g")
                    for (var i = 0; i < result.length; i++) {
                        for (var j = 0; j < keys.length; j++) {
                            var value = result[i][keys[j]];
                            if (!value)
                                value = ""
                            if (typeof value === "object")
                                value = value.toString();
                            //   archiveProcessor.consoleToFile(value);

                            value = ("" + value).replace(regex, " ");

                            str += value + sep
                        }
                        str += key + '\n';
                    }


                    var result = {
                        data: str,
                        // contentType: "text/csv"
                        contentType: "application/x-csv"
                    }

                    callback(null, result);


                }

                callback(null, "");


            })
        }
    }


    self.upload = function (req, fieldName, callback) {


        var diskStorage = multer.diskStorage({
            destination: function (request, file, callback) {
                callback(null, uploadDir);
            },
            filename: function (request, file, callback) {
                // archiveProcessor.consoleToFile(file);
                callback(null, file.originalname)
            }
        });
        var memStorage = multer.memoryStorage()


        var storage = diskStorage;

        var upload = multer({
            storage: storage,
            limits: {fileSize: 100 * 1000 * 1000} //100M
        }).single("archive");

        upload(req, null, function (err, data) {
            if (err) {
                callback('Error Occured' + err);
                return;
            }

            var file = path.normalize(uploadDir + "/" + req.file.originalname);
            var extractDir = path.normalize(uploadDir + "/temp/");
            var archiveRootDir = req.file.originalname.substring(0, req.file.originalname.lastIndexOf("."));
            var sender = req.body.sender;
            var archiveRootDir = path.normalize(extractDir + archiveRootDir);
            common.deleteFolderRecursive(archiveRootDir);
            extract(file, {dir: extractDir}, function (err) {
                if (err) {
                    archiveProcessor.consoleToFile(err);
                    return callback(err);
                }
                // extraction is complete. make sure to handle the err


                thunderbirdFoldersExtractor.getMailFolders(archiveRootDir, "objs", function (err, result) {


                    var nMails = result.length
                    for (var i = 0; i < result.length; i++) {
                        var mail = result[i];
                        mail.sender = sender;
                        mail.date_archive = new Date();
                        localDB.store(mail, function (err, result) {
                            if (err) {
                                archiveProcessor.consoleToFile(err);
                                callback(err)
                            }
                            var message = "done";//nMails + " mails envoyés et archivés <a href='/findMails?sender=" + sender + ">télécharger l'archive</a> ";
                            callback(null, message);
                        })
                    }

                });

            })
        })
    }
    return self;
})();


