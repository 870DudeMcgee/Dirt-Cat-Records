function createWorkflowRecorder(records) {
  const operations = [];

  return {
    async updateProject(projectId, patch) {
      operations.push({ type: "updateProject", projectId, patch });
      return records.updateProject(projectId, patch);
    },

    async createProjectEvent(event) {
      operations.push({ type: "createProjectEvent", event });
      return records.createProjectEvent(event);
    },

    async updateQuote(quoteId, patch) {
      if (!records.updateQuote) return null;
      operations.push({ type: "updateQuote", quoteId, patch });
      return records.updateQuote(quoteId, patch);
    },

    async linkOrderPaymentToProject(link) {
      if (!records.linkOrderPaymentToProject) return null;
      operations.push({ type: "linkOrderPaymentToProject", link });
      return records.linkOrderPaymentToProject(link);
    },

    getOperations() {
      return operations.slice();
    },
  };
}

module.exports = {
  createWorkflowRecorder,
};
