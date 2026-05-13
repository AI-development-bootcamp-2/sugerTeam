import type { DropdownDataResponse } from '../../../types/timeEntries';
import { WorkEntryBlock } from './WorkReportUi';

interface TimeEntryBlockProps {
  index: number;
  onRemove: () => void;
  dropdownData: DropdownDataResponse;
  isReadOnly: boolean;
  isOnlyEntry: boolean;
}

export default function TimeEntryBlock({
  index,
  onRemove,
  dropdownData,
  isReadOnly,
  isOnlyEntry,
}: TimeEntryBlockProps) {
  return (
    <WorkEntryBlock
      prefix={`entries.${index}`}
      dropdownData={dropdownData}
      disabled={isReadOnly}
      onRemove={onRemove}
      showRemove={!isReadOnly && !isOnlyEntry}
    />
  );
}
