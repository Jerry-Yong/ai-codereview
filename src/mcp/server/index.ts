import { MCPTool, ToolCallRequest, ToolCallResponse, ToolResult } from '../../types';
import { ToolRegistry } from './registry';

export class MCPServer {
  private registry: ToolRegistry;
  private running: boolean = false;

  constructor() {
    this.registry = new ToolRegistry();
  }

  getRegistry(): ToolRegistry {
    return this.registry;
  }

  registerTool(tool: MCPTool): void {
    this.registry.register(tool);
  }

  async start(): Promise<void> {
    this.running = true;
  }

  async stop(): Promise<void> {
    this.running = false;
  }

  isRunning(): boolean {
    return this.running;
  }

  async handleToolCall(request: ToolCallRequest): Promise<ToolCallResponse> {
    const tool = this.registry.getTool(request.toolName);

    if (!tool) {
      return {
        toolName: request.toolName,
        result: {
          success: false,
          data: null,
          error: `Tool not found: ${request.toolName}`,
        },
      };
    }

    // 验证输入
    const validationError = this.validateInput(tool, request.input);
    if (validationError) {
      return {
        toolName: request.toolName,
        result: {
          success: false,
          data: null,
          error: validationError,
        },
      };
    }

    try {
      const result: ToolResult = await tool.handler(request.input);
      return {
        toolName: request.toolName,
        result,
      };
    } catch (error) {
      return {
        toolName: request.toolName,
        result: {
          success: false,
          data: null,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  listTools(): Array<{ name: string; description: string; inputSchema: MCPTool['inputSchema'] }> {
    return this.registry.listTools().map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    }));
  }

  private validateInput(tool: MCPTool, input: Record<string, unknown>): string | null {
    const required = tool.inputSchema.required || [];
    for (const field of required) {
      if (!(field in input)) {
        return `Missing required field: ${field}`;
      }
    }
    return null;
  }
}
