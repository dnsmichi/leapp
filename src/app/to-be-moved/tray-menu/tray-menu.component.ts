import {Component, OnDestroy, OnInit} from '@angular/core';
import {WorkspaceService} from '../../services/workspace.service';
import {FileService} from '../../services/file.service';
import {AppService} from '../../services/app.service';
import {Session} from '../../models/session';
import {environment} from '../../../environments/environment';
import {UpdaterService} from '../../services/updater.service';
import {SessionService} from '../../services/session.service';
import {SessionFactoryService} from '../../services/session-factory.service';
import {Constants} from '../../models/constants';
import {LoggingService} from '../../services/logging.service';

@Component({
  selector: 'app-tray-menu',
  templateUrl: './tray-menu.component.html',
  styleUrls: ['./tray-menu.component.scss']
})
export class TrayMenuComponent implements OnInit, OnDestroy {

  // Used to define the only tray we want as active especially in linux context
  currentTray;
  subscribed;
  trayOpen = false;
  trayWindow;

  constructor(private workspaceService: WorkspaceService,
              private fileService: FileService,
              private sessionService: SessionService,
              private updaterService: UpdaterService,
              private loggingService: LoggingService,
              private sessionProviderService: SessionFactoryService,
              private appService: AppService) {
  }

  ngOnInit() {
    this.subscribed = this.workspaceService.sessions$.subscribe(() => {
      this.generateMenu();
    });
    this.generateMenu();
  }

  generateMenu() {
    const voices = [];

    // Remove unused voices from contextual menu
    const template = [
      {
        label: 'Leapp',
        submenu: [
          {label: 'About', role: 'about'},
          {label: 'Quit', role: 'quit'}
        ]
      },
      {
        label: 'Edit',
        submenu: [
          {label: 'Copy', role: 'copy'},
          {label: 'Paste', role: 'paste'}
        ]
      }
    ];
    if (!environment.production) {
      template[0].submenu.push({label: 'Open DevTool', role: 'toggledevtools'});
    }
    this.appService.getMenu().setApplicationMenu(this.appService.getMenu().buildFromTemplate(template));

    // check for dark mode
    let normalIcon = 'LeappMini';
    let updateIcon = 'LeappMini2';
    if (
      (this.appService.isDarkMode() && this.appService.detectOs() !== Constants.windows) ||
      this.appService.detectOs() === Constants.linux
    ) {
      normalIcon = 'LeappMini3';
      updateIcon = 'Leappmini4';
    }

    if (this.updaterService.getSavedVersionComparison() && this.updaterService.isReady()) {
      voices.push({ type: 'separator' });
      voices.push({ label: 'Check for Updates...', type: 'normal', click: () => this.updaterService.updateDialog() });
      // this.currentTray.setImage(__dirname + `/assets/images/${updateIcon}.png`);
    }
  }

  ngOnDestroy(): void {
    this.subscribed.unsubscribe();
  }

}
