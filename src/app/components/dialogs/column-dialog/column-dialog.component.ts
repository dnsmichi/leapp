import {Component, Input, OnDestroy, OnInit} from '@angular/core';
import {BsModalRef} from 'ngx-bootstrap/modal';
import {AppService} from '../../../services/app.service';
import {FormControl, FormGroup} from '@angular/forms';
import {globalColumns, IGlobalColumns} from '../../command-bar/command-bar.component';

@Component({
  selector: 'app-column-dialog',
  templateUrl: './column-dialog.component.html',
  styleUrls: ['./column-dialog.component.scss']
})
export class ColumnDialogComponent implements OnInit, OnDestroy {

  eGlobalColumns: IGlobalColumns;

  columnForm = new FormGroup({
    role: new FormControl(),
    provider: new FormControl(),
    namedProfile: new FormControl(),
    region: new FormControl()
  });

  private subscription;
  private values;

  constructor(private bsModalRef: BsModalRef, private appService: AppService) {}

  ngOnInit(): void {
    // Set new state
    this.columnForm.get('role').setValue(this.eGlobalColumns.role);
    this.columnForm.get('provider').setValue(this.eGlobalColumns.provider);
    this.columnForm.get('namedProfile').setValue(this.eGlobalColumns.namedProfile);
    this.columnForm.get('region').setValue(this.eGlobalColumns.region);

    this.subscription = this.columnForm.valueChanges.subscribe((values: IGlobalColumns) => {
      this.values = values;
      console.log(values);
    });
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  closeModal() {
    this.appService.closeModal();
  }

  setColumns() {
    globalColumns.next(this.values);
    this.appService.closeModal();
  }
}
