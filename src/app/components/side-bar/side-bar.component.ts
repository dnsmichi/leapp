import { Component, OnInit } from '@angular/core';
import {WorkspaceService} from '../../services/workspace.service';
import Folder from '../../models/folder';
import Segment from '../../models/Segment';

@Component({
  selector: 'app-side-bar',
  templateUrl: './side-bar.component.html',
  styleUrls: ['./side-bar.component.scss']
})
export class SideBarComponent implements OnInit {

  folders: Folder[];
  segments: Segment[];

  constructor(private workspaceService: WorkspaceService) {
    this.folders = this.workspaceService.getFolders();
    this.segments = this.workspaceService.getSegments();
  }

  ngOnInit(): void {}

  resetFilters() {

  }

  showOnlyPinned() {

  }

  applySegmentFilter(segment: Segment) {

  }
}
