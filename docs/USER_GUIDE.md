# User Guide: Smart Document Agent

Welcome to the Smart Document Agent! This application is designed to help you analyze, query, and extract insights from your documents (PDFs, TXT, CSVs) using advanced AI.

---

## 1. Workspaces (Sessions)

The application uses "Sessions" (or Workspaces) to keep your documents and chats organized.

- **Creating a Workspace:** Click the "New Workspace" `+` button in the left sidebar.
- **Switching Workspaces:** Click on any existing workspace name in the sidebar. Your documents and chat history for that specific workspace will instantly load.
- **Renaming/Deleting:** Use the pencil icon to rename a workspace, or the trash can icon to delete it permanently.

---

## 2. Uploading Documents

Once inside a workspace, you can add documents.

1. Locate the **Upload Zone** on the right side of the screen.
2. Drag and drop your files into the dotted area, or click "Select File" to browse.
3. Supported formats: `.pdf`, `.txt`, `.csv`.
4. **Auto-Summary:** Upon a successful upload, the AI will instantly read the beginning of the document and post an automated "Document Summary" card into the chat.

---

## 3. Chatting with your Documents (RAG)

You can ask the AI questions about *any* document uploaded to the current workspace.

- Type your question into the input box at the bottom of the screen.
- Example: *"What is the main conclusion of the Q3 report?"*
- The AI uses **Targeted Semantic Search** to find the exact paragraphs in your documents that answer the question.
- **Citations:** At the bottom of the AI's response, look for the gray badge (e.g., `report.pdf`). This shows you exactly which file the AI pulled the information from.

---

## 4. Advanced Tools

Look at the Top Bar of the application to find advanced analysis tools.

### 📊 Data Extraction (Table Tool)
Need to pull structured data (like lists of names, financial figures, or dates) out of long text?

1. Click the **Extract Data** button (Table icon) in the top bar.
2. Enter your query (e.g., *"Extract all company names and their locations"*).
3. The AI will scan the documents and present the data in a clean, tabular format.
4. **Export:** Click "Download CSV" to save the table to your computer.

### ⚖️ Multi-Document Comparison (Split Window Tool)
Need to find the differences between two versions of a contract or compare two research papers?

1. Click the **Compare Docs** button (Split window icon) in the top bar.
2. Select Document A from the first dropdown.
3. Select Document B from the second dropdown.
4. Enter your comparison query (e.g., *"What are the differences in the indemnification clauses?"*).
5. The AI will analyze both documents specifically against your query and generate a detailed comparative report in the chat window.
