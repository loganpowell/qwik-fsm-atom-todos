declare module "javascript-state-machine" {
  interface StateMachineConfig {
    init?: string;
    transitions: Array<{
      name: string;
      from: string | string[];
      to: string;
    }>;
    methods?: Record<string, (...args: any[]) => any>;
  }

  class StateMachine {
    constructor(config: StateMachineConfig);
    state: string;
    [key: string]: any;
  }

  export = StateMachine;
}
