import * as fs from "fs";
import * as vscode from "vscode";
const path = require('path');
import { readFileToArr } from './utils/readFileToArr';

const extensionArray: string[] = ["htm", "html", "jsx", "tsx","wxml"];
const htmMatchRegex: RegExp = /class="[\w- ]+"/g;
const sxMatchRegex: RegExp = /className="[\w- ]+"/g;

function provideCompletionItems(
  document: vscode.TextDocument,
  position: vscode.Position,
  _token: vscode.CancellationToken,
  _context: vscode.CompletionContext
) {
  const typeText = document
    .lineAt(position)
    .text.substring(position.character - 1, position.character);
  if (typeText !== ".") {
    return;
  }
  // 获取当前文件路径
  const filePath: string = document.fileName;
  let classNames: string[] = [];
  // 在vue文件触发
  if (document.languageId === "vue") {
    // 读取当前文件
    classNames = getClass(filePath);
  }
  // 在css类文件触发
  else {
    // 获取当前文件夹路径
    const dir: string = path.dirname(filePath);
    // 读取当前文件夹下的文件名
    const files: string[] = fs.readdirSync(dir);
    // 筛选目标文件
    const target: string[] = files.filter((item: string) =>
      extensionArray.includes(item.split(".")[1])
    );
    // 读取目标文件，获取class
    target.forEach((item: string) => {
      const filePath: string = `${dir}/${item}`;
      classNames = getClass(filePath);
    });
  }

  classNames = classNames.reduce((arr, ele) => {
    const className: string = ele.split("=")[1];
    // 去掉引号
    const field: string = className.slice(1, className.length - 1);
    // 处理多class情况
    if (ele.includes(" ")) {
      return arr.concat(field.split(" "));
    } else {
      arr.push(field);
      return arr;
    }
  }, [] as string[]);

  return classNames.map( (ele: string) => {
    return new vscode.CompletionItem(
      // 提示内容要带上触发字符，https://github.com/Microsoft/vscode/issues/71662
      document.languageId === "vue" ? `${ele}` : `.${ele}`,
      vscode.CompletionItemKind.Text
    );
  });
}

function getClass(path: string) {
  const data: string = fs.readFileSync(path, "utf8").split("\n").join("");
  var fileExtension = path.substring(path.lastIndexOf('.') + 1);
  let result;
  // htm/html/vue-->class
  const classFileType = ['htm','html','vue','wxml'];
  if ( classFileType.includes( fileExtension ) ) {
    result = data.match(htmMatchRegex);
  }

  const classNameFileType = ['tsx','jsx'];
  // tsx/jsx-->className
  if ( classNameFileType.includes(fileExtension) ) {
    result = data.match(sxMatchRegex);
  }
  return result || [];
}

//事件关闭后的回调
function resolveCompletionItem() {
  return null;
} 

/* 
=============================================================================点击光标跳转部分=======================================
*/

async function provideDefinition(
    document: vscode.TextDocument,
    position: vscode.Position,
){
    const fileName    = document.fileName; // 当前文件完整路径
    const workDir     = path.dirname(fileName); //当前文件所在目录
    const word        = document.getText(document.getWordRangeAtPosition(position)); // 当前光标所在单词 
    const line        = document.lineAt(position);// 当前光标所在行
    let startIndex:number = line.text.indexOf('class="') + 7 ;
    let endIndex:number = line.text.indexOf('"', startIndex);
    const clickLineClassList = line.text.substring(startIndex,endIndex).split(" ");
    //当前点击的单词不是个class名称
    if(!clickLineClassList.includes(word)) { return ; }
    const fileContent = await fs.readdirSync(workDir)
        .filter( v => ['css','less','scss','sass','stylus'].includes( v.substring(v.lastIndexOf(".") + 1 )))
        .reduce( async ( obj:any, url )=>{
            let fileUrl = `${workDir}/${url}`;
            let resList:any = await readFileToArr(fileUrl);
            resList.forEach( (lineData:any,index:number) => {
                let className = lineData.match(/.(\S*){/);
                className && obj.push({
                    className:className[1].replace(".",""),
                    line:index + 1,
                    filePath:fileUrl
                });
            });
            return obj;
        },[]);
    let toClassFileData = fileContent.find( ( item:{ className:string }) => item.className === word );
    if(toClassFileData && fs.existsSync(toClassFileData.filePath)){
        const { filePath,line } = toClassFileData;
        return new vscode.Location( vscode.Uri.file(filePath), new vscode.Position(line, 0) );
    }
}

export default function (context: vscode.ExtensionContext) {
  // 注册代码建议提示，只有当按下“.”时才触发
    context.subscriptions.push(
        //在当前文件内触发事件
        vscode.languages.registerCompletionItemProvider(
            [
                { scheme: "file", language: "css" },
                { scheme: "file", language: "less" },
                { scheme: "file", language: "scss" },
                { scheme: "file", language: "sass" },
                { scheme: "file", language: "stylus" },
                { scheme: "file", language: "vue" },
            ],
            {
                provideCompletionItems,
                resolveCompletionItem,
            },
            //在上面这些文件输入 . 后触发事件
            "."
        ),
        vscode.languages.registerDefinitionProvider(
            [
                { scheme: "file", language: "html" },
                { scheme: "file", language: "htm" },
                { scheme: "file", language: "wxml" }
            ],
            {
                provideDefinition
            })
    );
}
