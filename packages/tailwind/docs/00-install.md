# Blackcube Aurelia 2 tailwindui toolkit

Allow easy setup of tailwind components using aurelia2

## Install

``` 
npm install @blackcube/aurelia2-tailwind
```
### Registering it in app

```typescript
import Aurelia, { ConsoleSink, LoggerConfiguration, LogLevel} from 'aurelia';
import { TailwindConfiguration } from "@blackcube/aurelia2-tailwind";
import { MyApp } from './my-app';
Aurelia
    .register(TailwindConfiguration)
    .register(LoggerConfiguration.create({
        level: LogLevel.trace,
        colorOptions: 'colors',
        sinks: [ConsoleSink]
    }))
    .app(MyApp)
    .start();


```