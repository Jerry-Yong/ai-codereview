import { MCPServer } from '../server';
import { ToolCallRequest, ToolCallResponse, ToolResult } from '../../types';

export class MCPClient {
  private server: MCPServer;

  constructor(server: MCPServer) {
    this.server = server;
  }

  async callTool(toolName: string, input: Record<string, unknown> = {}): Promise<ToolResult> {
    const request: ToolCallRequest = { toolName, input };
    const response: ToolCallResponse = await this.server.handleToolCall(request);
    return response.result;
  }

  listAvailableTools(): Array<{ name: string; description: string }> {
    return this.server.listTools().map((t) => ({
      name: t.name,
      description: t.description,
    }));
  }

  async callToolOrThrow(toolName: string, input: Record<string, unknown> = {}): Promise<unknown> {
    const result = await this.callTool(toolName, input);
    if (!result.success) {
      throw new Error(`Tool call failed [${toolName}]: ${result.error}`);
    }
    return result.data;
  }
}
