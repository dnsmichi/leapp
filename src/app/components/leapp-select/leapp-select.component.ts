import {Component, EventEmitter, Input, OnInit, Output, ViewChild} from '@angular/core';
import {NgSelectComponent} from '@ng-select/ng-select';
import {FormGroup} from '@angular/forms';

@Component({
  selector: 'app-leapp-select',
  templateUrl: './leapp-select.component.html',
  styleUrls: ['./leapp-select.component.scss']
})
export class LeappSelectComponent implements OnInit {

  @ViewChild('ngSelectComponent')
  ngSelectComponent: NgSelectComponent;

  @Input()
  placeholder: string;

  @Input()
  controlName: string;

  @Input()
  form: FormGroup;

  @Input()
  bindLabel: string;

  @Input()
  bindValue: string;

  @Input()
  items: any[];

  @Input()
  selectedItem: any;

  @Input()
  dropdownPosition: string;

  @Input()
  defaultNewValue: any;

  @Input()
  whatToAddName: string;

  @Output()
  selected = new EventEmitter<{ items: any[]; selectedItem: any }>();

  temporaryName: string;

  constructor() {
    this.temporaryName = '';
  }

  ngOnInit(): void {}

  setTemporaryName($event: any) {
    this.temporaryName = $event.target.value;
  }

  checkNewElement(): boolean {
    return this.temporaryName !== '' && this.items.filter(s => s[this.bindLabel].indexOf(this.temporaryName) > -1).length === 0;
  }

  addNewElement(): void {
    const newElement = {};
    newElement[this.bindLabel] = this.temporaryName;
    newElement[this.bindValue] = this.isFunction(this.defaultNewValue) ? this.defaultNewValue() : this.defaultNewValue;

    this.selectedItem = newElement;
    this.items.push(newElement);
    this.items = [...this.items];
    this.ngSelectComponent.handleClearClick();
    this.selected.emit({ items: this.items, selectedItem: this.selectedItem });
  }

  private isFunction(obj) {
    return !!(obj && obj.constructor && obj.call && obj.apply);
  }
}
