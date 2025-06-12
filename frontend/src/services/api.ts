// Enhanced API service with proper error handling and development mode
import type {
  DashboardStats,
  WorkflowData,
  ActivityItem,
  SystemMetric,
  IntegrationStatus,
  ModelInfo,
  AgentInfo,
  ChatResponse,
  AgentTask,
  AgentExecutionResult
} from '../types';

// Development-friendly API configuration
const isDevelopment = import.meta.env.DEV;
const API_BASE = import.meta.env.VITE_API_URL || 'https://work-2-cmasavtinjksmicy.prod-runtime.all-hands.dev';
const WS_BASE = import.meta.env.VITE_WS_URL || 'wss://work-2-cmasavtinjksmicy.prod-runtime.all-hands.dev';

// Enhanced error handling
class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public response?: Response
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Agent types mapping
export const AGENT_TYPES = {
  CODE_GENERATOR: 'code_generator',
  DEBUG_AGENT: 'debug_agent',
  TESTING_AGENT: 'testing_agent',
  DEPLOY_AGENT: 'deploy_agent',
  BROWSER_AGENT: 'browser_agent',
  SECURITY_AGENT: 'security_agent',
  DOCUMENTATION_AGENT: 'documentation_agent',
  PERFORMANCE_OPTIMIZER: 'performance_optimizer',
  ARCHITECTURE_ADVISOR: 'architecture_advisor'
} as const;

export type AgentType = typeof AGENT_TYPES[keyof typeof AGENT_TYPES];

export interface AgentStatus {
  agent_type: string;
  status: 'idle' | 'busy' | 'error' | 'offline';
  current_task: string | null;
  performance: {
    success_rate: number;
    avg_response_time: number;
  };
  last_updated: string;
}

class EnhancedApiService {
  private isOnline = true;
  private retryAttempts = 3;
  private retryDelay = 1000;

  constructor() {
    this.checkConnection();
  }

  private async checkConnection(): Promise<void> {
    try {
      const response = await fetch(`${API_BASE}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      this.isOnline = response.ok;

      if (isDevelopment) {
        console.log(`🔗 API Connection: ${this.isOnline ? '✅ Online' : '❌ Offline'}`);
        console.log(`📡 API Base URL: ${API_BASE}`);
      }
    } catch (error) {
      this.isOnline = false;
      if (isDevelopment) {
        console.warn('⚠️ API connection failed, using fallback mode');
      }
    }
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${API_BASE}${endpoint}`;

    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        const response = await fetch(url, {
          headers: {
            'Content-Type': 'application/json',
            ...options?.headers,
          },
          ...options,
        });

        if (!response.ok) {
          // Handle different HTTP errors
          if (response.status >= 500) {
            throw new ApiError(`Server error: ${response.statusText}`, response.status, response);
          } else if (response.status >= 400) {
            const errorData = await response.json().catch(() => ({ error: response.statusText }));
            throw new ApiError(errorData.detail || errorData.error || response.statusText, response.status, response);
          }
        }

        const data = await response.json();

        // Mark as online if successful
        if (!this.isOnline) {
          this.isOnline = true;
          if (isDevelopment) console.log('🔗 API connection restored');
        }

        return data;

      } catch (error) {
        if (isDevelopment) {
          console.warn(`🔄 API request attempt ${attempt}/${this.retryAttempts} failed:`, error);
        }

        if (attempt === this.retryAttempts) {
          this.isOnline = false;
          if (error instanceof ApiError) {
            throw error;
          }
          throw new ApiError(
            `Network error after ${this.retryAttempts} attempts: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt));
      }
    }

    throw new ApiError('Max retry attempts reached');
  }

  // Fallback data for offline mode
  private getFallbackData<T>(endpoint: string): T {
    const fallbackData: Record<string, any> = {
      '/api/dashboard/stats': {
        agents: { active: 8, total: 25 },
        workflows: { active: 3, total: 12 },
        projects: { active: 2, total: 8 },
        system: { cpu_usage: 67.8, memory_usage: 89.2, disk_usage: 45.3 }
      },
      '/api/agents': {
        agents: {
          code_generator: { status: 'active', performance: 94.2 },
          debug_agent: { status: 'idle', performance: 87.5 },
          testing_agent: { status: 'busy', performance: 91.8 },
          deploy_agent: { status: 'active', performance: 96.1 },
          security_agent: { status: 'active', performance: 88.9 }
        },
        active_tasks: 12,
        total_agents: 25
      },
      '/api/models': {
        models: [
          { id: 'deepseek-r1', name: 'DeepSeek R1', status: 'loaded', performance: 95 },
          { id: 'llama-local', name: 'Llama Local', status: 'loaded', performance: 92 },
          { id: 'gpt-4', name: 'GPT-4 (Backup)', status: 'available', performance: 98 }
        ],
        status: 'online'
      },
      '/api/workflows': {
        workflows: [
          { id: '1', name: 'Code Analysis', status: 'running', progress: 75 },
          { id: '2', name: 'Security Scan', status: 'running', progress: 45 },
          { id: '3', name: 'Documentation', status: 'completed', progress: 100 }
        ]
      },
      '/api/system/metrics': {
        cpu: { name: 'CPU', value: 67.8, color: 'blue' },
        memory: { name: 'Memory', value: 89.2, color: 'green' },
        disk: { name: 'Disk', value: 45.3, color: 'yellow' }
      },
      '/api/integrations/status': {
        integrations: [
          { name: 'GitHub', status: 'connected', lastCheck: new Date().toISOString() },
          { name: 'Slack', status: 'connected', lastCheck: new Date().toISOString() },
          { name: 'JIRA', status: 'disconnected', lastCheck: new Date().toISOString() }
        ]
      },
      '/api/activity/recent': {
        activities: [
          { id: '1', title: 'Code analysis complete', type: 'agent', status: 'success', timestamp: new Date() },
          { id: '2', title: 'Memory sync in progress', type: 'system', status: 'info', timestamp: new Date() },
          { id: '3', title: 'New pattern discovered', type: 'agent', status: 'info', timestamp: new Date() }
        ]
      }
    };

    return fallbackData[endpoint] || {} as T;
  }

  private async requestWithFallback<T>(endpoint: string, options?: RequestInit): Promise<T> {
    try {
      return await this.request<T>(endpoint, options);
    } catch (error) {
      if (isDevelopment) {
        console.warn(`📱 Using fallback data for ${endpoint}:`, error);
      }
      return this.getFallbackData<T>(endpoint);
    }
  }

  // Dashboard Stats
  async getDashboardStats(): Promise<DashboardStats> {
    return this.requestWithFallback<DashboardStats>('/api/dashboard/stats');
  }

  // ============================================================================
  // AGENT APIs
  // ============================================================================

  async getAgents(): Promise<{ agents: Record<string, any>; active_tasks: number; total_agents: number }> {
    return this.requestWithFallback('/api/agents');
  }

  async getAgentStatus(agentType: AgentType): Promise<AgentStatus> {
    try {
      return await this.request<AgentStatus>(`/api/agents/${agentType}/status`);
    } catch (error) {
      return {
        agent_type: agentType,
        status: 'offline',
        current_task: null,
        performance: { success_rate: 0, avg_response_time: 0 },
        last_updated: new Date().toISOString()
      };
    }
  }

  async executeAgentTask(agentType: AgentType, taskData: Record<string, any>): Promise<AgentExecutionResult> {
    return this.request<AgentExecutionResult>(`/api/agents/${agentType}/execute`, {
      method: 'POST',
      body: JSON.stringify(taskData),
    });
  }

  async getAgentHistory(agentType: AgentType, limit: number = 10): Promise<{ agent_type: string; history: AgentTask[]; total_tasks: number }> {
    try {
      return await this.request(`/api/agents/${agentType}/history?limit=${limit}`);
    } catch (error) {
      return { agent_type: agentType, history: [], total_tasks: 0 };
    }
  }

  async cancelAgentTask(agentType: AgentType, taskId: string): Promise<{ success: boolean; message: string }> {
    return this.request(`/api/agents/${agentType}/tasks/${taskId}`, {
      method: 'DELETE',
    });
  }

  // Legacy compatibility methods
  async startAgent(agentId: string): Promise<void> {
    await this.executeAgentTask(agentId as AgentType, { action: 'start' });
  }

  async stopAgent(agentId: string): Promise<void> {
    const status = await this.getAgentStatus(agentId as AgentType);
    if (status.current_task) {
      await this.cancelAgentTask(agentId as AgentType, status.current_task);
    }
  }

  // Workflows
  async getWorkflows(): Promise<{ workflows: WorkflowData[] }> {
    return this.requestWithFallback<{ workflows: WorkflowData[] }>('/api/workflows');
  }

  async createWorkflow(workflow: Partial<WorkflowData>): Promise<WorkflowData> {
    return this.request<WorkflowData>('/api/workflows', {
      method: 'POST',
      body: JSON.stringify(workflow),
    });
  }

  async startWorkflow(workflowId: string): Promise<void> {
    await this.request(`/api/workflows/${workflowId}/start`, { method: 'POST' });
  }

  async stopWorkflow(workflowId: string): Promise<void> {
    await this.request(`/api/workflows/${workflowId}/stop`, { method: 'POST' });
  }

  // Models
  async getModels(): Promise<{ models: ModelInfo[] }> {
    return this.requestWithFallback<{ models: ModelInfo[] }>('/api/models');
  }

  async loadModel(modelId: string): Promise<void> {
    await this.request('/api/models/load', {
      method: 'POST',
      body: JSON.stringify({ model_id: modelId }),
    });
  }

  async unloadModel(modelId: string): Promise<void> {
    await this.request('/api/models/unload', {
      method: 'POST',
      body: JSON.stringify({ model_id: modelId }),
    });
  }

  // System Metrics
  async getSystemMetrics(): Promise<{ [key: string]: SystemMetric }> {
    return this.requestWithFallback<{ [key: string]: SystemMetric }>('/api/system/metrics');
  }

  // Integration Status
  async getIntegrationStatus(): Promise<{ integrations: IntegrationStatus[] }> {
    return this.requestWithFallback<{ integrations: IntegrationStatus[] }>('/api/integrations/status');
  }

  // Recent Activity
  async getRecentActivity(): Promise<{ activities: ActivityItem[] }> {
    return this.requestWithFallback<{ activities: ActivityItem[] }>('/api/activity/recent');
  }

  // Health Check
  async healthCheck(): Promise<{ status: string; version?: string; services?: any }> {
    try {
      return await this.request<{ status: string; version?: string; services?: any }>('/health');
    } catch (error) {
      return { status: 'offline' };
    }
  }

  // Chat API
  async sendChatMessage(content: string, options?: {
    system_prompt?: string;
    max_tokens?: number;
    temperature?: number;
  }): Promise<ChatResponse> {
    return this.request('/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        content,
        system_prompt: options?.system_prompt,
        max_tokens: options?.max_tokens || 1024,
        temperature: options?.temperature || 0.7,
      }),
    });
  }

  // Generic request methods
  async get<T = any>(endpoint: string): Promise<{ data: T }> {
    const data = await this.requestWithFallback<T>(endpoint);
    return { data };
  }

  async post<T = any>(endpoint: string, body?: any): Promise<{ data: T }> {
    const data = await this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
    return { data };
  }

  // Connection status
  getConnectionStatus(): boolean {
    return this.isOnline;
  }

  // WebSocket creation helper
  createWebSocket(endpoint: string = '/ws/chat'): WebSocket {
    const wsUrl = `${WS_BASE}${endpoint}`;
    const ws = new WebSocket(wsUrl);

    if (isDevelopment) {
      ws.onopen = () => console.log(`🔌 WebSocket connected: ${wsUrl}`);
      ws.onclose = () => console.log('🔌 WebSocket disconnected');
      ws.onerror = (error) => console.error('🔌 WebSocket error:', error);
    }

    return ws;
  }
}

// Export singleton instance
export const apiService = new EnhancedApiService();
export const api = apiService;

// Export for backward compatibility
export default apiService;