import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';

import { HELP_SECTIONS, HelpSection } from './help-content';

@Component({
  selector: 'app-help',
  standalone: true,
  imports: [CommonModule, FormsModule, InputTextModule],
  templateUrl: './help.html',
  styleUrls: ['./help.css'],
})
export class Help {
  sections = HELP_SECTIONS;

  searchTerm = signal('');
  activeId = signal<string>(HELP_SECTIONS[0].id);

  filteredSections = computed<HelpSection[]>(() => {
    const term = this.searchTerm().trim().toLowerCase();
    if (!term) {
      return this.sections;
    }
    return this.sections.filter(
      (s) =>
        s.title.toLowerCase().includes(term) ||
        s.summary.toLowerCase().includes(term) ||
        s.overview.some((p) => p.toLowerCase().includes(term)),
    );
  });

  active = computed<HelpSection>(() => {
    const found = this.sections.find((s) => s.id === this.activeId());
    return found ?? this.sections[0];
  });

  select(section: HelpSection): void {
    this.activeId.set(section.id);
    // Jump the reading pane back to the top whenever the topic changes,
    // since it may still be scrolled down from a previous long section.
    const pane = document.querySelector('.help-reading-pane');
    pane?.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
