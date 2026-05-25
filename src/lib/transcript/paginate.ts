import type { TranscriptCourse } from "@/lib/clr/types";

function formatSkillValue(skill: TranscriptCourse["skillDetails"][number] | string) {
  if (typeof skill === "string") {
    return skill;
  }

  return skill.proficiencyLevel
    ? `${skill.name} ${skill.proficiencyLevel}`
    : skill.name;
}

function estimateCourseRowUnits(course: TranscriptCourse) {
  const renderedSkills = (
    course.skillDetails.length > 0 ? course.skillDetails : course.skills
  ).map((skill) => formatSkillValue(skill));
  const totalSkillCharacters = renderedSkills.reduce(
    (total, skill) => total + skill.length,
    0,
  );
  const hasDetailedSkills = course.skillDetails.some(
    (skill) => Boolean(skill.proficiencyLevel),
  );

  let units = 3;

  if (course.title.length > 60) {
    units += 1;
  }

  if (course.code.length > 14) {
    units += 1;
  }

  if (course.summary.length > 90) {
    units += 1;
  }

  if (course.summary.length > 170) {
    units += 1;
  }

  if (renderedSkills.length > 2) {
    units += 1;
  }

  if (totalSkillCharacters > 30) {
    units += 1;
  }

  if (totalSkillCharacters > 60) {
    units += 1;
  }

  if (hasDetailedSkills) {
    units += 1;
  }

  if (course.status.length > 12) {
    units += 1;
  }

  return units;
}

function takePage(
  courses: TranscriptCourse[],
  startIndex: number,
  capacity: number,
) {
  const page: TranscriptCourse[] = [];
  let usedCapacity = 0;
  let nextIndex = startIndex;

  while (nextIndex < courses.length) {
    const course = courses[nextIndex];
    const rowUnits = estimateCourseRowUnits(course);

    if (page.length > 0 && usedCapacity + rowUnits > capacity) {
      break;
    }

    page.push(course);
    usedCapacity += rowUnits;
    nextIndex += 1;
  }

  return {
    page,
    usedCapacity,
    nextIndex,
  };
}

export function paginateCourses(
  courses: TranscriptCourse[],
  firstPageCapacity = 18,
  laterPageCapacity = 24,
) {
  const {
    page: cover,
    usedCapacity: coverUsedCapacity,
    nextIndex: coverEndIndex,
  } = takePage(
    courses,
    0,
    firstPageCapacity,
  );
  const overflow: TranscriptCourse[][] = [];
  const overflowUsedCapacity: number[] = [];
  let nextIndex = coverEndIndex;

  while (nextIndex < courses.length) {
    const nextPage = takePage(courses, nextIndex, laterPageCapacity);
    overflow.push(nextPage.page);
    overflowUsedCapacity.push(nextPage.usedCapacity);
    nextIndex = nextPage.nextIndex;
  }

  return {
    cover,
    coverUsedCapacity,
    overflow,
    overflowUsedCapacity,
    firstPageCapacity,
    laterPageCapacity,
  };
}
