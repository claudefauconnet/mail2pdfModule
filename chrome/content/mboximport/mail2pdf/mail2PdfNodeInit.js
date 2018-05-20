console.log("run node in thunderbird !!!!!!!!!!!!!!");
var fs=require("fs");
var path=require("path");
var mailProcessor=require("./myMailProcessor.js")
var id=Math.round(Math.random()*10000);
var file=path.resolve(__dirname,"test_"+id+".txt")
    fs.writeFileSync(file,"aaaaa")

//**********************************************Command Line args***********************************
var dataFilePath =null;
var targetPdfPath = null;
if (true) {
    dataFilePath = "C:\\/Users/claud/AppData/Roaming/Thunderbird/Profiles/lb11cn7x.default/pdfArchives\\EXPORT_MAILS_TO_PDF.json"
    targetPdfPath = "C:\\Users\\claud";
}else{
    var args = process.argv;
    console.log("---args  "+JSON.stringify(args))
     dataFilePath = args[2];
     targetPdfPath = args[3];
}


   // console.log(__dirname)
    console.log("---dataFilePath---"+dataFilePath);
    console.log("---targetPdfPath---"+targetPdfPath);

    mailProcessor.processMails(dataFilePath,targetPdfPath);


