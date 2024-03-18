# TypeScript State Machine

This TypeScript state machine library provides a robust framework for defining and managing state transitions in your applications. It ensures type safety throughout the process, allowing you to define states, events, and actions with precision.

## Features

- **Type Safety:** Enjoy the benefits of TypeScript's static typing to catch errors at compile-time.
- **State Transitions:** Define states and easily manage transitions between them.
- **Entry and Exit Actions:** Execute custom actions when entering or exiting states.
- **Event Handling:** Handle events within states, with support for custom actions and target states.
- **After Events:** Trigger actions after a specified delay.
- **Context Management:** Manage context data associated with states and events.
- **Subscription:** Subscribe to state changes and context updates.

## Installation

You can install the package via npm:

```bash
npm install muz
# or
yarn add muz
# or
bun add muz
# ...
```

## Documentation

### MachineConfiguration

The `MachineConfiguration` class is used to define the state machine configuration. It provides a fluent API to declare states, events, actions, and context.

#### Constructor

```typescript
new MachineConfiguration(config: {
  declare: string[];
  states: {
    [state: string]: {
      on: {
        [event: string]: {
          target?: string;
          action?: (context: any, data?: any) => void;
          after?: number;
        };
      };
    };
  };
  initial: string;
  context?: any;
});
```

- `declare`: An array of state names to declare.
- `states`: An object containing state definitions. Each state definition contains an `on` object, which maps event names to event handlers.
- `initial`: The initial state of the state machine.
- `context`: An optional object to define the initial context of the state machine.

#### Methods

- `create(): StateMachine`: Creates a new instance of the state machine.

### StateMachine

The `StateMachine` class represents an instance of the state machine. It provides methods to start, and send events to the state machine, as well as subscribe to state changes and context updates.

#### Methods

- `start(): StateMachine`: Starts the state machine.
- `send<T extends string>(): (event: string, data?: any) => void`: Sends an event to the state machine. The generic type `T` is used to specify the current state of the state machine.
- `subscribe(listener: (state: string, context: any, type: 'State-Change' | 'Context-Change') => void): void`: Subscribes to state changes and context updates.

## Usage Example

Here's a simple example to demonstrate the usage of the library:

```typescript
import { MachineConfiguration } from 'typescript-state-machine';

// Define your state machine configuration
const config = new MachineConfiguration({
  declare: ['reading', 'editing'],
  states: {
    reading: {
      on: {
        edit: {
          target: 'editing',
          action(context, data) {}
        }
      }
    },
    editing: {
      on: {
        cancel: {
          target: 'reading'
        },
        save: {
          target: 'reading',
          action: (context) => {
            context.committedValue = context.value;
          }
        },
        edit: {
          action: (context, data: 'A' | 'B') => {
            context.value = data;
          }
        }
      }
    }
  },
  initial: 'reading',
  context: {
    committedValue: '',
    value: ''
  }
});

// Create an instance of the state machine and start it
const instance = config.create().start();

// Subscribe to state changes
instance.subscribe(({ state, context }, type) => {
  if (type === 'Context-Change') return;
  console.log(context.committedValue);
});

// Send events to trigger state transitions
instance.send<'reading'>()('edit');
instance.send<'editing'>()('edit', 'A');
instance.send<'editing'>()('save');
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please feel free to submit a pull request or open an issue if you encounter any problems or have any suggestions.
