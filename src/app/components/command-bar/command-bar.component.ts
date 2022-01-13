import {AfterContentChecked, Component, ElementRef, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {BsModalService} from 'ngx-bootstrap/modal';
import {OptionsDialogComponent} from '../dialogs/options-dialog/options-dialog.component';
import {CreateDialogComponent} from '../dialogs/create-dialog/create-dialog.component';
import {EditDialogComponent} from '../dialogs/edit-dialog/edit-dialog.component';
import {SegmentDialogComponent} from '../dialogs/segment-dialog/segment-dialog.component';
import {WorkspaceService} from '../../services/workspace.service';
import {FormControl, FormGroup} from '@angular/forms';
import {BehaviorSubject} from 'rxjs';
import {Session} from '../../models/session';
import {AppService} from '../../services/app.service';

export interface GlobalFilters {
  searchFilter: string;
  dateFilter: boolean;
  providerFilter: {name: string; value: boolean}[];
  profileFilter: {name: string; value: boolean}[];
  regionFilter: {name: string; value: boolean}[];
  integrationFilter: {name: string; value: boolean}[];
  typeFilter: {category: string; name: string; value: boolean}[];
}

export const globalFilteredSessions = new BehaviorSubject<Session[]>([]);
export const compactMode = new BehaviorSubject<boolean>(false);
export const globalFilterGroup = new BehaviorSubject<GlobalFilters>(null);
export const globalHasFilter = new BehaviorSubject<boolean>(false);

export interface IGlobalColumns {
  role: boolean;
  provider: boolean;
  namedProfile: boolean;
  region: boolean;
}
export const globalColumns = new BehaviorSubject<IGlobalColumns>(null);

@Component({
  selector: 'app-command-bar',
  templateUrl: './command-bar.component.html',
  styleUrls: ['./command-bar.component.scss']
})
export class CommandBarComponent implements OnInit, OnDestroy, AfterContentChecked {
  @ViewChild('parent') parent: ElementRef;
  @ViewChild('child') child: ElementRef;
  overflowed = false;

  filterForm = new FormGroup({
    searchFilter: new FormControl(''),
    dateFilter: new FormControl(true),
    providerFilter: new FormControl([]),
    profileFilter: new FormControl([]),
    regionFilter: new FormControl([]),
    integrationFilter: new FormControl([]),
    typeFilter: new FormControl([])
  });

  providers: {name: string; value: boolean}[];
  profiles: {id: string; name: string; value: boolean}[];
  integrations: any[];
  types: {category: string; name: string; value: boolean}[];
  regions: {name: string; value: boolean}[];

  filterExtended: boolean;
  compactMode: boolean;

  private subscription;

  constructor(private bsModalService: BsModalService, private workspaceService: WorkspaceService, private appService: AppService) {
    this.filterExtended = false;
    this.compactMode = false;

    globalFilteredSessions.next(this.workspaceService.sessions);

    globalColumns.next({
      role: true,
      provider: true,
      namedProfile: true,
      region: true
    });

    this.providers = [
      { name: 'Amazon AWS', value: false },
      { name: 'Microsoft Azure', value: false }
    ];

    this.integrations = [];

    this.types = [
      { category: 'Amazon AWS', name: 'IAM Role Federated', value: false },
      { category: 'Amazon AWS', name: 'IAM User', value: false },
      { category: 'Amazon AWS', name: 'IAM Role Chained', value: false },
      { category: 'Amazon AWS', name: 'IAM Single Sign-On', value: false },
      { category: 'Microsoft Azure', name: 'Azure Subscription', value: false }
    ];

    this.profiles = this.workspaceService.getProfiles().map(element => ({ name: element.name, id: element.id, value: false }));

    this.regions = this.appService.getRegions().map(element => ({ name: element.region, value: false }));
  }

  ngOnInit(): void {

    this.subscription = this.filterForm.valueChanges.subscribe((values: GlobalFilters) => {
      globalFilterGroup.next(values);
      if(values.searchFilter === '') {
        return globalFilteredSessions.next(this.workspaceService.sessions);
      } else {
        globalFilteredSessions.next(this.workspaceService.sessions.filter(session => session.sessionName.toLowerCase().indexOf(values.searchFilter.toLowerCase()) > -1));
      }
    });

  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  ngAfterContentChecked(): void {
    if(this.parent && this.child) {
      const parentW = parseInt(this.parent.nativeElement.clientWidth, 10);
      const childW = parseInt(this.child.nativeElement.clientWidth, 10);
      this.overflowed = childW > parentW;
    }
  }

  showOptionDialog() {
    this.bsModalService.show(OptionsDialogComponent, { animated: false, class: 'option-modal'});
  }

  showCreateDialog() {
    this.bsModalService.show(CreateDialogComponent, { animated: false, class: 'create-modal'});
  }

  showEditDialog() {
    this.bsModalService.show(EditDialogComponent, { animated: false, class: 'edit-modal'});
  }

  toggleCompactMode() {
    this.compactMode = !this.compactMode;
    compactMode.next(this.compactMode);
  }

  toggleFilters() {
    this.filterExtended = !this.filterExtended;
    globalHasFilter.next(this.filterExtended);
  }

  toggleDateFilter() {
    this.filterForm.get('dateFilter').setValue(!this.filterForm.get('dateFilter').value);
  }

  openSaveSegmentDialog() {
    this.bsModalService.show(SegmentDialogComponent, { animated: false, class: 'segment-modal'});
  }

  checkFormIsDirty() {
    return this.filterForm.get('dateFilter').value ||
           this.filterForm.get('providerFilter').value.length > 0 ||
           this.filterForm.get('profileFilter').value.length > 0 ||
           this.filterForm.get('regionFilter').value.length > 0 ||
           this.filterForm.get('integrationFilter').value.length > 0 ||
           this.filterForm.get('typeFilter').value.length > 0;
  }

}
