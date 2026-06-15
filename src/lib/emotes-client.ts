function escapeHtml(s: string) {
  return s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
}

export function renderMessageHtmlClient(content: string) {
  return escapeHtml(content).replace(/\n/g, "<br />");
}
