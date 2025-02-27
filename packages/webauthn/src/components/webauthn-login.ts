import {bindable, customElement, ILogger, INode, IPlatform, resolve} from 'aurelia';
import {IRouter} from '@aurelia/router';
import {IWebauthnService} from '../services/webauthn-service';
import template from './webauthn-login.html';

@customElement({name: 'bc-webauthn-login', template})
export class WebauthnLogin {

    @bindable() public route: string = '';
    @bindable() public url: string = '';
    @bindable() public user: boolean = false;
    public error: boolean = false;
    public email: string = '';

    public constructor(
        private logger: ILogger = resolve(ILogger).scopeTo('WebauthnLogin'),
        private webauthnService: IWebauthnService = resolve(IWebauthnService),
        private readonly router: IRouter = resolve(IRouter),
        private readonly platform: IPlatform = resolve(IPlatform),
        private readonly element: Element = resolve(INode) as Element,
    ) {
        this.logger.debug('Constructor');
    }

    public attached(): void | Promise<void> {
        this.logger.debug('Attached');
        this.webauthnService.isAvailable().then((available) => {
            if (available) {
                this.logger.debug('WebAuthn is available');
            } else {
                this.logger.debug('WebAuthn is not available');
                this.element.remove();
            }
        });
    }

    public onSubmitLogin(evt: Event) {
        evt.preventDefault();
        this.logger.debug('Login');
        const webauthnRequest = this.user ? this.webauthnService.login(this.email): this.webauthnService.loginDevice();
        webauthnRequest.then((status: boolean) => {
                if (status) {
                    this.logger.debug('Login success');
                    this.error = false;
                    if (this.route !== '') {
                        this.logger.debug('Navigate to ' + this.route);
                        this.router.load(this.route);
                    } else if (this.url !== '') {
                        this.logger.debug('Navigate to ' + this.url);
                        this.platform.window.location.href = this.url;
                    }
                } else {
                    this.error = true;
                    this.logger.error('Login failed');
                }
            })
            .catch((err) => {
                this.error = true;
                this.logger.error('Service failed');
            });
    }
}