type TStateObject<Keys extends string, TContext> = {
  /**
   * The entry event of the state, it is executed when the state is entered
   */
  entry?: (context: TContext) => void;
  /**
   * The exit event of the state, it is executed when the state is exited
   */
  exit?: (context: TContext) => void;
  /**
   * On events, the key is the event name
   */
  on?: {
    [event: string]: {
      target?: Keys;
      action?: (context: TContext, data?: any) => void;
    };
  };
  /**
   * After events, the key is the delay in milliseconds
   */
  after?: {
    [delay: string]: {
      target?: Keys;
      action?: (context: TContext) => void;
    };
  };
};

class MachineConfiguration<
  TContext extends Record<string, any>,
  TStatesDeclaration extends string,
  TStatesImplementation extends Record<TStatesDeclaration, TStateObject<TStatesDeclaration, TContext>>
> {
  private readonly stateDeclaration: TStatesDeclaration[];
  private readonly statesImplementation: TStatesImplementation;
  private readonly initialState: TStatesDeclaration;
  private readonly context: TContext = {} as TContext;

  constructor(config: {
    declare: TStatesDeclaration[];
    states: TStatesImplementation;
    initial: TStatesDeclaration;
    context: TContext;
  }) {
    this.stateDeclaration = config.declare;
    this.statesImplementation = config.states;
    this.initialState = config.initial;
    this.context = config.context;
  }

  /**
   * Create a new instance of the machine
   * @param context - The context of the machine
   * @param initialState - The initial state of the machine
   */
  public create(
    {
      context,
      initialState
    }: {
      context: TContext;
      initialState: TStatesDeclaration;
    } = {
      context: this.context,
      initialState: this.initialState
    }
  ) {
    return new MachineInstance(this.statesImplementation, initialState, structuredClone(context));
  }
}

class MachineInstance<
  TContext extends Record<string, any>,
  TStatesDeclaration extends string,
  TStatesImplementation extends Record<TStatesDeclaration, TStateObject<TStatesDeclaration, TContext>>
> {
  private stateID: TStatesDeclaration;
  private stateObject: TStatesImplementation[TStatesDeclaration];
  private subscribers: Array<
    (snapshot: { state: TStatesDeclaration; context: TContext }, eventType: 'State-Change' | 'Context-Change') => void
  > = [];

  constructor(
    private readonly statesImplementation: TStatesImplementation,
    private readonly initialState: TStatesDeclaration,
    private readonly context: TContext,
    private guards?: {
      [key in keyof TContext]: (context: TContext) => boolean;
    }
  ) {
    this.stateID = initialState;
    this.stateObject = statesImplementation[initialState];
  }

  /**
   * Set the state of the machine
   * @param stateID - The state to set
   * @returns - The machine instance
   */
  private setState(stateID: TStatesDeclaration) {
    // if stateId does not exist on the machine, throw an error
    if (!this.statesImplementation[stateID]) {
      throw new Error(`State \`${this.stateID as string}\` does not exist on the machine`);
    }

    // if previous state has an exit event, and the new state is different from the previous state, execute the exit event
    if (stateID !== this.stateID) {
      const exitEvent = this.stateObject.exit;
      exitEvent && exitEvent(this.context);
    }

    // console.log(`State changed from ${this.stateID} to ${stateID}`);

    this.stateID = stateID;
    this.stateObject = this.statesImplementation[stateID];

    // if new state has an entry event, execute it
    const entryEvent = this.stateObject.entry;
    entryEvent && entryEvent(this.context);

    this.subscribers.forEach((subscriber) => {
      subscriber(
        {
          context: this.context,
          state: this.stateID
        },
        'State-Change'
      );
    });

    const afterEvents = this.stateObject.after;

    // if state has after events, execute them
    if (afterEvents) {
      for (const delay in afterEvents) {
        const afterEvent = afterEvents[delay];
        const afterEventTarget = afterEvent.target;
        const afterEventAction = afterEvent.action;

        setTimeout(() => {
          afterEventAction && this.executeAction(afterEventAction);
          afterEventTarget && this.setState(afterEventTarget);
        }, Number(delay));
      }
    }

    return this;
  }

  /**
   * Execute an action
   * @param action - The action to execute
   * @returns - The machine instance
   */
  private executeAction(action: (context: TContext, data: any) => void, data?: any) {
    // create a clone of context before executing to check if the new context obeys the rules in guards
    const clonedContext = structuredClone(this.context);
    action(this.context, data);

    // check if the new context obeys the rules in guards
    for (const guard in this.guards) {
      if (!this.guards[guard](this.context)) {
        this.context[guard] = clonedContext[guard];
      }
    }

    // if new context is not exactly the same as old context, update the subscribers
    if (JSON.stringify(clonedContext) !== JSON.stringify(this.context)) {
      this.subscribers.forEach((subscriber) => {
        subscriber(
          {
            context: this.context,
            state: this.stateID
          },
          'Context-Change'
        );
      });
    }

    return this;
  }

  /**
   * Start the machine, setting the initial state
   * @returns - The machine instance
   */
  public start() {
    this.setState(this.initialState);
    return this;
  }

  /**
   * Send an event to the machine
   * @param event - The event to send
   * @returns - The machine instance
   * @throws - If the event does not exist on the current state
   * @throws - If the current state does not have any event
   */
  public send<TCurrentState extends TStatesDeclaration>() {
    return <
      TEventName extends keyof TStatesImplementation[TCurrentState]['on'],
      TData extends TStatesImplementation[TCurrentState]['on'][TEventName] extends {
        action: (context: TContext, data: infer D) => void;
      }
        ? D
        : void
    >(
      event: TEventName,
      ...data: TData extends void ? [] : unknown extends TData ? [] : [TData]
    ) => {
      const currentStateEvents = this.stateObject.on;
      // if current event does not have any event, throw an error
      if (!currentStateEvents) {
        throw new Error(`State \`${this.stateID as string}\` does not have any event`);
      }
      // if current state does not have the event, throw an error
      if (!currentStateEvents[event as unknown as string]) {
        throw new Error(`State \`${this.stateID as string}\` does not have event \`${event as unknown as string}\``);
      }
      const eventObject = currentStateEvents[event as unknown as string];
      const eventTarget = eventObject.target;
      const eventAction = eventObject.action;

      // if event has an action, execute it
      eventAction && this.executeAction(eventAction, data);
      // if event has a target, change the state
      eventTarget && this.setState(eventTarget);
    };
  }

  /**
   * Subscribe to the machine
   * @param subscriber - The subscriber function
   * @returns - A function to unsubscribe
   */
  public subscribe(
    subscriber: (
      snapshot: { state: TStatesDeclaration; context: TContext },
      eventType: 'State-Change' | 'Context-Change'
    ) => void
  ) {
    this.subscribers.push(subscriber);
    return () => {
      this.subscribers = this.subscribers.filter((sub) => sub !== subscriber);
    };
  }

  /**
   * Get a snapshot of the machine
   * @returns - The snapshot of the machine
   */
  getSnapshot() {
    return {
      context: this.context,
      state: this.stateID
    };
  }
}

export default { MachineConfiguration, MachineInstance };
