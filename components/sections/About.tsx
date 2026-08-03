import AboutJSON from '../../public/json/about.json'
import AboutBlock from '../elements/AboutBlock'
import ItemizedSectionWrapper from '../elements/ItemizedSectionWrapper'
import PageContainer from '../elements/PageContainer'
import PageHeading from '../elements/PageHeading'
import TechItem from '../elements/TechItem'

export default function About({}) {
  const { summary, education, certifications, skills, recognition, languages } =
    AboutJSON

  return (
    <PageContainer>
      <PageHeading
        title="About"
        svgPath="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
      ></PageHeading>

      <p className="font-body md:pl-6 md:max-w-3xl text-sm md:text-base">
        {summary}
      </p>

      <ItemizedSectionWrapper>
        <AboutBlock title="EDUCATION" index={0}>
          {education.map((school) => (
            <div key={school.qualification} className="flex flex-col gap-y-1">
              <div className="font-bold">{school.qualification}</div>
              <div className="text-sm md:text-base">
                {school.institution + ', ' + school.location}
              </div>
              <div className="text-sm text-queenBlue">{school.year}</div>
              {school.highlights.map((highlight) => (
                <div key={highlight} className="text-sm md:text-base">
                  {highlight}
                </div>
              ))}
            </div>
          ))}
        </AboutBlock>

        <AboutBlock title="SKILLS" index={1}>
          {skills.map((group, i) => (
            <div key={group.category} className="flex flex-col gap-y-2">
              <div className="font-bold text-sm md:text-base">
                {group.category}
              </div>
              <div className="flex flex-wrap gap-3">
                {group.items.map((item) => (
                  <TechItem key={item} index={i + 1}>
                    {item}
                  </TechItem>
                ))}
              </div>
            </div>
          ))}
        </AboutBlock>

        <AboutBlock title="CERTIFICATIONS" index={2}>
          {certifications.map((cert) => (
            <div key={cert.name} className="flex flex-col gap-y-1">
              <div className="font-bold">{cert.name}</div>
              <div className="text-sm text-queenBlue">{cert.year}</div>
            </div>
          ))}
        </AboutBlock>

        <AboutBlock title="RECOGNITION" index={3}>
          {recognition.map((award) => (
            <div key={award.title + award.year} className="flex flex-col gap-y-1">
              <div className="font-bold">{award.title}</div>
              <div className="text-sm md:text-base">{award.detail}</div>
              <div className="text-sm text-queenBlue">{award.year}</div>
            </div>
          ))}
        </AboutBlock>

        <AboutBlock title="LANGUAGES" index={4}>
          <div className="flex flex-wrap gap-3">
            {languages.map((lang) => (
              <TechItem key={lang.language} index={4}>
                {lang.language + ' — ' + lang.proficiency}
              </TechItem>
            ))}
          </div>
        </AboutBlock>
      </ItemizedSectionWrapper>
    </PageContainer>
  )
}
