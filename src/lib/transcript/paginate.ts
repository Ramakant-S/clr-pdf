import type { TranscriptCourse } from "@/lib/clr/types";

export function paginateCourses(
  courses: TranscriptCourse[],
  firstPageSize = 10,
  laterPageSize = 14,
) {
  const cover = courses.slice(0, firstPageSize);
  const remaining = courses.slice(firstPageSize);
  const overflow: TranscriptCourse[][] = [];

  for (let index = 0; index < remaining.length; index += laterPageSize) {
    overflow.push(remaining.slice(index, index + laterPageSize));
  }

  return {
    cover,
    overflow,
  };
}
