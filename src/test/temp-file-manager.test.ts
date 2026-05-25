import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockVSCode, MockUri, MockPosition, MockSelection } from './mocks/vscode';
import { TempFileManager } from '../features/inline-sql/temp-file-manager';
import { LanguageHandler } from '../features/inline-sql/language-handler';

vi.mock('fs', () => ({
  existsSync: vi.fn(() => true),
  mkdirSync: vi.fn(),
}));

function createMockEditor(content: string, lang = 'python', filePath = '/workspace/test.py') {
  const uri = MockUri.file(filePath);
  return {
    document: {
      uri,
      languageId: lang,
      fileName: filePath,
      getText: (_range?: unknown) => content,
      isClosed: false,
      lineCount: content.split('\n').length,
      positionAt: (offset: number) => {
        const lines = content.substring(0, offset).split('\n');
        return new MockPosition(lines.length - 1, lines[lines.length - 1].length);
      },
    },
    selection: new MockSelection(new MockPosition(0, 0), new MockPosition(0, content.length)),
    edit: vi.fn(() => Promise.resolve(true)),
  } as unknown as import('vscode').TextEditor;
}

describe('TempFileManager', () => {
  let manager: TempFileManager;
  let languageHandler: LanguageHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    languageHandler = new LanguageHandler();
    manager = new TempFileManager(languageHandler);
  });

  describe('createTempSQLFile', () => {
    it('should create a temp file and register listeners', async () => {
      const editor = createMockEditor('"SELECT * FROM users"');
      const selection = new MockSelection(new MockPosition(0, 0), new MockPosition(0, 21));

      const result = await manager.createTempSQLFile(
        editor,
        selection as unknown as import('vscode').Selection,
        '"SELECT * FROM users"'
      );

      expect(result.ok).toBe(true);
      expect(manager.getActiveTempFilesCount()).toBe(1);
    });
  });

  describe('close listener cleanup', () => {
    it('should cleanup temp file when document is closed', async () => {
      const editor = createMockEditor('"SELECT 1"');
      const selection = new MockSelection(new MockPosition(0, 0), new MockPosition(0, 10));

      const result = await manager.createTempSQLFile(
        editor,
        selection as unknown as import('vscode').Selection,
        '"SELECT 1"'
      );
      expect(result.ok).toBe(true);
      expect(manager.getActiveTempFilesCount()).toBe(1);

      const tempUri = result.value!;
      const closedDoc = mockVSCode.__test__.createDocument('', 'sql', tempUri.fsPath);
      mockVSCode.__test__.fireDidClose(closedDoc);

      expect(manager.getActiveTempFilesCount()).toBe(0);
    });

    it('should not cleanup unrelated document close', async () => {
      const editor = createMockEditor('"SELECT 1"');
      const selection = new MockSelection(new MockPosition(0, 0), new MockPosition(0, 10));

      await manager.createTempSQLFile(
        editor,
        selection as unknown as import('vscode').Selection,
        '"SELECT 1"'
      );
      expect(manager.getActiveTempFilesCount()).toBe(1);

      const unrelatedDoc = mockVSCode.__test__.createDocument('', 'python', '/tmp/unrelated.py');
      mockVSCode.__test__.fireDidClose(unrelatedDoc);

      expect(manager.getActiveTempFilesCount()).toBe(1);
    });
  });

  describe('cleanupOnClose=false mode', () => {
    it('should cleanup after successful save sync when cleanupOnClose is false', async () => {
      mockVSCode.workspace.getConfiguration = vi.fn(() => ({
        get: vi.fn((key: string, defaultValue?: unknown) => {
          if (key === 'cleanupOnClose') return false;
          if (key === 'tempFileCleanup') return true;
          return defaultValue;
        }),
        update: vi.fn(),
        has: vi.fn(() => false),
        inspect: vi.fn(() => undefined),
      })) as unknown as typeof mockVSCode.workspace.getConfiguration;

      const editor = createMockEditor('"SELECT 1"');
      const selection = new MockSelection(new MockPosition(0, 0), new MockPosition(0, 10));

      const result = await manager.createTempSQLFile(
        editor,
        selection as unknown as import('vscode').Selection,
        '"SELECT 1"'
      );
      expect(result.ok).toBe(true);
      expect(manager.getActiveTempFilesCount()).toBe(1);

      const tempUri = result.value!;
      const savedDoc = mockVSCode.__test__.createDocument('SELECT 1', 'sql', tempUri.fsPath);
      mockVSCode.__test__.fireDidSave(savedDoc);

      await vi.waitFor(() => {
        expect(manager.getActiveTempFilesCount()).toBe(0);
      });
    });
  });

  describe('dispose', () => {
    it('should cleanup all temp files on dispose', async () => {
      const editor = createMockEditor('"SELECT 1"');
      const selection = new MockSelection(new MockPosition(0, 0), new MockPosition(0, 10));

      let callCount = 0;
      const originalNow = Date.now;
      vi.spyOn(Date, 'now').mockImplementation(() => originalNow() + callCount++);

      await manager.createTempSQLFile(
        editor,
        selection as unknown as import('vscode').Selection,
        '"SELECT 1"'
      );
      await manager.createTempSQLFile(
        editor,
        selection as unknown as import('vscode').Selection,
        '"SELECT 2"'
      );

      expect(manager.getActiveTempFilesCount()).toBe(2);
      manager.dispose();
      expect(manager.getActiveTempFilesCount()).toBe(0);

      vi.restoreAllMocks();
    });
  });
});
