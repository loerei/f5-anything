const vscode = require('vscode');

function activate(context) {
    // Auto-ensure Code Runner executes in Integrated Terminal for full ANSI color and input support
    try {
        const codeRunnerConfig = vscode.workspace.getConfiguration('code-runner');
        if (!codeRunnerConfig.get('runInTerminal')) {
            codeRunnerConfig.update('runInTerminal', true, vscode.ConfigurationTarget.Global);
        }
        if (!codeRunnerConfig.get('saveFileBeforeRun')) {
            codeRunnerConfig.update('saveFileBeforeRun', true, vscode.ConfigurationTarget.Global);
        }
    } catch (e) {
        // Silently handle if config is read-only
    }

    // 1. Command: Exclude Current Folder
    let excludeCmd = vscode.commands.registerCommand('f5-anything.excludeCurrentFolder', async function () {
        const folder = getActiveFolderPath();
        if (!folder) {
            vscode.window.showWarningMessage('[F5 Anything] No active folder or workspace found.');
            return;
        }
        const config = vscode.workspace.getConfiguration('f5-anything');
        let list = config.get('excludedFolders') || [];
        if (!list.includes(folder)) {
            list.push(folder);
            await config.update('excludedFolders', list, vscode.ConfigurationTarget.Global);
            vscode.window.showInformationMessage(`[F5 Anything] Added "${folder}" to Exclude list.`);
        } else {
            vscode.window.showInformationMessage(`[F5 Anything] "${folder}" is already in Exclude list.`);
        }
    });

    // 2. Command: Include Current Folder
    let includeCmd = vscode.commands.registerCommand('f5-anything.includeCurrentFolder', async function () {
        const folder = getActiveFolderPath();
        if (!folder) {
            vscode.window.showWarningMessage('[F5 Anything] No active folder or workspace found.');
            return;
        }
        const config = vscode.workspace.getConfiguration('f5-anything');
        let list = config.get('includedFolders') || [];
        if (!list.includes(folder)) {
            list.push(folder);
            await config.update('includedFolders', list, vscode.ConfigurationTarget.Global);
            vscode.window.showInformationMessage(`[F5 Anything] Added "${folder}" to Include list.`);
        } else {
            vscode.window.showInformationMessage(`[F5 Anything] "${folder}" is already in Include list.`);
        }
    });

    // 3. Command: Toggle Mode (Exclude <-> Include)
    let toggleCmd = vscode.commands.registerCommand('f5-anything.toggleMode', async function () {
        const config = vscode.workspace.getConfiguration('f5-anything');
        const currentMode = config.get('mode') || 'exclude';
        const newMode = currentMode === 'exclude' ? 'include' : 'exclude';
        await config.update('mode', newMode, vscode.ConfigurationTarget.Global);
        vscode.window.showInformationMessage(`[F5 Anything] Switched mode to: ${newMode.toUpperCase()}`);
    });

    // 4. Smart F5 Execution Handler with Exclude / Include Logic
    let runCmd = vscode.commands.registerCommand('f5-anything.runSmart', async function () {
        const config = vscode.workspace.getConfiguration('f5-anything');
        const mode = config.get('mode') || 'exclude';
        const excluded = config.get('excludedFolders') || [];
        const included = config.get('includedFolders') || [];
        const currentFolder = getActiveFolderPath();

        if (mode === 'exclude') {
            if (currentFolder && listMatchesFolder(excluded, currentFolder)) {
                vscode.window.showWarningMessage(`[F5 Anything] Execution skipped: Folder is in Exclude list.`);
                return;
            }
        } else if (mode === 'include') {
            if (!currentFolder || !listMatchesFolder(included, currentFolder)) {
                vscode.window.showWarningMessage(`[F5 Anything] Execution skipped: Folder is not in Include list.`);
                return;
            }
        }

        // Trigger Code Runner execution
        await vscode.commands.executeCommand('code-runner.run');
    });

    context.subscriptions.push(excludeCmd, includeCmd, toggleCmd, runCmd);
}

function getActiveFolderPath() {
    const editor = vscode.window.activeTextEditor;
    if (editor && editor.document) {
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(editor.document.uri);
        if (workspaceFolder) {
            return workspaceFolder.uri.fsPath;
        }
        return require('path').dirname(editor.document.uri.fsPath);
    }
    if (vscode.workspace.workspaceFolder && vscode.workspace.workspaceFolder.length > 0) {
        return vscode.workspace.workspaceFolder[0].uri.fsPath;
    }
    return null;
}

function listMatchesFolder(list, folderPath) {
    if (!list || list.length === 0) return false;
    const normalizedFolder = folderPath.toLowerCase();
    return list.some(item => {
        const normalizedItem = item.toLowerCase();
        return normalizedFolder === normalizedItem || normalizedFolder.startsWith(normalizedItem);
    });
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
};
