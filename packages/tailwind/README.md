# Redcat Aurelia 2 tailwind toolkit

Allow easy setup of tailwind components using aurelia2

## Using it:

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


### `bc-tw-menu-mobile` attribute

* datasets used in main html:
  * `[data-menu-mobile="open"]` - element used to open menu
  * `[data-menu-mobile="close"]` - element used to close menu
  * `[data-menu-mobile="overlay"]` - overlay element
  * `[data-menu-mobile="offcanvas"]` - offcanvas element

#### Example:

```html

<!-- Off-canvas menu for mobile, show/hide based on off-canvas menu state. -->
<div class="relative z-50 lg:hidden" role="dialog" aria-modal="true" bc-tw-menu-mobile="">
    <!--
      Off-canvas menu backdrop, show/hide based on off-canvas menu state.

      Entering: "transition-opacity ease-linear duration-300"
        From: "opacity-0"
        To: "opacity-100"
      Leaving: "transition-opacity ease-linear duration-300"
        From: "opacity-100"
        To: "opacity-0"
    -->
    <div class="fixed inset-0 bg-gray-900/80 opacity-0" aria-hidden="true" data-menu-mobile="overlay"></div>

    <div class="fixed inset-0 flex">
        <!--
          Off-canvas menu, show/hide based on off-canvas menu state.

          Entering: "transition ease-in-out duration-300 transform"
            From: "-translate-x-full"
            To: "translate-x-0"
          Leaving: "transition ease-in-out duration-300 transform"
            From: "translate-x-0"
            To: "-translate-x-full"
        -->
        <div class="relative mr-16 flex w-full max-w-xs flex-1 -translate-x-full" data-menu-mobile="offcanvas">
            <!--
              Close button, show/hide based on off-canvas menu state.

              Entering: "ease-in-out duration-300"
                From: "opacity-0"
                To: "opacity-100"
              Leaving: "ease-in-out duration-300"
                From: "opacity-100"
                To: "opacity-0"
            -->
            <div class="absolute left-full top-0 flex w-16 justify-center pt-5 opacity-0">
                <button type="button" class="-m-2.5 p-2.5"  data-menu-mobile="close">
                    <span class="sr-only">Close sidebar</span>
                    <svg class="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true" data-slot="icon">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
            <!-- Sidebar component, swap this element with another sidebar if you like -->
            <div class="flex grow flex-col gap-y-5 overflow-y-auto bg-white px-6 pb-4">
                <!-- sidebar -->
            </div>
        </div>
    </div>
</div>
```

### `bc-tw-menu-sidebar` attribute

* datasets used in main html:
  * `[data-menu-sidebar-arrow]` - arrow showing if there is submenu and if it's open or closed
  * `[data-menu-sidebar="<value>"]` - value is the name of the menu item. The name is used to store in local storage if the menu is open or closed

#### Example:

```html
<nav class="flex flex-1 flex-col" bc-tw-menu-sidebar="">
        <ul role="list" class="flex flex-1 flex-col gap-y-7">
            <li>
                <ul role="list" class="-mx-2 space-y-1">
                    <li>
                        <!-- Current: "bg-gray-50 text-indigo-600", Default: "text-gray-700 hover:text-indigo-600 hover:bg-gray-50" -->
                        <a href="#">
                            <svg class="h-6 w-6 shrink-0 text-indigo-600">
                                <!-- Heroicon name: outline/home -->
                            </svg>
                            Dashboard
                        </a>
                    </li>
                    <li>
                        <a href="#" class="group flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 bg-gray-50 text-indigo-600">
                            <svg class="h-6 w-6 shrink-0 text-gray-400">
                                <!-- Heroicon name: outline/collection -->
                            </svg>
                            Team
                    </li>
                    <li>
                        <div>
                            <button type="button" class="flex w-full items-center gap-x-3 rounded-md p-2 text-left text-sm font-semibold leading-6 text-gray-700 hover:bg-gray-50">
                                <svg class="h-6 w-6 shrink-0 text-gray-400">
                                    <!-- Heroicon name: outline/users -->
                                </svg>
                                Users
                                <!-- Expanded: "rotate-90 text-gray-500", Collapsed: "text-gray-400" -->
                                <svg class="ml-auto h-5 w-5 shrink-0 text-gray-400" data-menu-sidebar-arrow="">
                                    <!-- Heroicon name: outline/chevron-right -->
                                </svg>
                            </button>
                            
                            <!-- Expandable link section, show/hide based on state. -->
                            <ul class="mt-1 px-2 hidden" id="sub-menu-users">
                                <li>
                                    <!-- 44px -->
                                    <a href="#" class="block rounded-md py-2 pl-9 pr-2 text-sm leading-6 text-gray-700 hover:bg-gray-50">
                                        Teachers
                                    </a>
                                </li>
                                <li>
                                    <!-- 44px -->
                                    <a href="#" class="block rounded-md py-2 pl-9 pr-2 text-sm leading-6 text-gray-700 hover:bg-gray-50">
                                        Students
                                    </a>
                                </li>
                            </ul>
                        </div>
                    </li>
                </ul>
            </li>
            <!-- stuff for sidebar -->
        </ul>
    </nav>
```