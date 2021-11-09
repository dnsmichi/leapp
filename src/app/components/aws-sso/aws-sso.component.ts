import {Component, OnInit} from '@angular/core';
import {Router} from '@angular/router';
import {FormControl, FormGroup, Validators} from '@angular/forms';
import {AppService, LoggerLevel, ToastLevel} from '../../services/app.service';
import {WorkspaceService} from '../../services/workspace.service';
import {AwsSsoRoleService, SsoRoleSession} from '../../services/session/aws/methods/aws-sso-role.service';
import {Constants} from '../../models/constants';
import {AwsSsoOidcService, BrowserWindowClosing} from '../../services/aws-sso-oidc.service';
import {AwsSsoConfiguration} from '../../models/workspace';
import {LoggingService} from '../../services/logging.service';

@Component({
  selector: 'app-aws-sso',
  templateUrl: './aws-sso.component.html',
  styleUrls: ['./aws-sso.component.scss']
})
export class AwsSsoComponent implements OnInit, BrowserWindowClosing {

  eConstants = Constants;
  regions = [];
  selectedAwsSsoConfiguration: AwsSsoConfiguration;
  loadingInBrowser = false;
  loadingInApp = false;

  public awsSsoConfigurations: AwsSsoConfiguration[];
  public modifying: number;

  public form = new FormGroup({
    portalUrl: new FormControl('', [Validators.required, Validators.pattern('https?://.+')]),
    awsRegion: new FormControl('', [Validators.required]),
    defaultBrowserOpening: new FormControl('', [Validators.required])
  });

  constructor(
    private appService: AppService,
    private awsSsoRoleService: AwsSsoRoleService,
    private router: Router,
    private workspaceService: WorkspaceService,
    private awsSsoOidcService: AwsSsoOidcService,
    private loggingService: LoggingService
  ) {}

  ngOnInit() {
    this.awsSsoOidcService.listeners.push(this);

    this.loadingInBrowser = false;
    this.loadingInApp = false;

    this.setValues();
  }

  async logout(configurationId: string) {
    this.selectedAwsSsoConfiguration = this.workspaceService.getAwsSsoConfiguration(configurationId);
    await this.awsSsoRoleService.logout(this.selectedAwsSsoConfiguration);

    this.loadingInBrowser = false;
    this.loadingInApp = false;

    this.setValues();
  }

  async forceSync(configurationId: string) {
    this.selectedAwsSsoConfiguration = this.workspaceService.getAwsSsoConfiguration(configurationId);

    if (this.selectedAwsSsoConfiguration && !this.loadingInApp) {
      this.loadingInBrowser = (this.selectedAwsSsoConfiguration.browserOpening === Constants.inBrowser.toString());
      this.loadingInApp = (this.selectedAwsSsoConfiguration.browserOpening === Constants.inApp.toString());

      try {
        const ssoRoleSessions: SsoRoleSession[] = await this.awsSsoRoleService.sync(this.selectedAwsSsoConfiguration);
        ssoRoleSessions.forEach(ssoRoleSession => {
          this.awsSsoRoleService.create(ssoRoleSession, this.workspaceService.getDefaultProfileId());
        });
        this.router.navigate(['/sessions', 'session-selected']);
        this.loadingInBrowser = false;
        this.loadingInApp = false;
      } catch (err) {
        await this.logout(configurationId);
        throw err;
      }
    }
  }

  async goBack() {
    await this.router.navigate(['/sessions', 'session-selected']);
  }

  async gotoWebForm(configurationId: string) {
    // TODO: call aws sso oidc service directly
    this.awsSsoRoleService.interrupt();
    await this.forceSync(configurationId);
  }

  setValues() {
    this.modifying = 0;
    this.regions = this.appService.getRegions();
    this.awsSsoConfigurations = this.workspaceService.getAwsSsoConfigurations();

    this.selectedAwsSsoConfiguration = {
      id: 'new AWS Single Sign-On',
      region: this.regions[0].region,
      portalUrl: '',
      browserOpening: Constants.inApp,
      expirationTime: undefined
    };
  }

  closeLoadingScreen() {
    // TODO: call aws sso oidc service directly
    this.awsSsoRoleService.interrupt();
    this.loadingInBrowser = false;
    this.loadingInApp = false;
  }

  catchClosingBrowserWindow(): void {
    this.loadingInBrowser = false;
    this.loadingInApp = false;
  }

  async isAwsSsoActive(awsSsoConfiguration: AwsSsoConfiguration) {
    return await this.awsSsoRoleService.awsSsoActive(awsSsoConfiguration);
  }

  openAddModal(modifying, currentAwsSsoConfiguration) {
    this.modifying = modifying;
    this.selectedAwsSsoConfiguration = currentAwsSsoConfiguration;

    this.form.get('portalUrl').setValue(this.selectedAwsSsoConfiguration.portalUrl);
    this.form.get('awsRegion').setValue(this.selectedAwsSsoConfiguration.region);
    this.form.get('defaultBrowserOpening').setValue(this.selectedAwsSsoConfiguration.browserOpening);
  }

  save() {
    if(this.form.valid) {
      const portalUrl = this.form.get('portalUrl').value;
      const region = this.form.get('awsRegion').value;
      const browserOpening = this.form.get('defaultBrowserOpening').value;

      console.log(portalUrl, region, browserOpening);

      if(this.modifying === 1) {
        // Save
        this.workspaceService.addAwsSsoConfiguration(
          region,
          portalUrl,
          browserOpening
        );
      } else if(this.modifying === 2 && this.selectedAwsSsoConfiguration.portalUrl !== '') {
        // Edit
        this.workspaceService.updateAwsSsoConfiguration(
          this.selectedAwsSsoConfiguration.id,
          region,
          portalUrl,
          browserOpening
        );
      }

      this.setValues();
      this.openAddModal(0, this.selectedAwsSsoConfiguration);
    } else {
      this.appService.toast('Form is not valid', ToastLevel.warn, 'Form validation');
    }
  }

  delete(awsSsoConfiguration: AwsSsoConfiguration) {
    // Ask for deletion
    this.appService.confirmDialog(`Deleting this configuration will also logout from its sessions: do you wannt to proceed?`, async (res) => {
      if (res !== Constants.confirmClosed) {
        this.loggingService.logger(`Removing sessions with attached aws sso config id: ${awsSsoConfiguration.id}`, LoggerLevel.info, this);
        this.logout(awsSsoConfiguration.id);
        this.workspaceService.deleteAwsSsoConfiguration(awsSsoConfiguration.id);
      }
    });
  }
}