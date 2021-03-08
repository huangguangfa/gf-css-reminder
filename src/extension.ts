import * as vscode from "vscode";
import completion from "./completion";

export function activate(context: vscode.ExtensionContext) {
  completion(context);
}

export function deactivate() {}
