import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface ActorsPageProps {
  stepNumber: number;
  totalSteps: number;
  onPrev: () => void;
  onNext: () => void;
}

const ACTORS = [
  {
    title: "La cheffe d'établissement",
    description:
      "La cheffe d'établissement partage son temps entre la direction de l'école et une classe de CE2-CM1. Elle enseigne à mi-temps et consacre l'autre moitié de son temps à la direction : organisation de l'école, suivi des élèves, échanges avec les familles et coordination avec l'équipe enseignante. Par délégation de l'OGEC, elle encadre également les personnels non enseignants au quotidien.",
  },
  {
    title: 'Les enseignants',
    description:
      "Les 11 professeurs des écoles se répartissent entre les 9 classes, de la maternelle au CM2. Ils font découvrir de nouvelles notions, préparent les activités et accompagnent les élèves tout au long de l'année (dont les APC). Ils suivent les progrès de chacun et échangent régulièrement avec les familles.",
  },
  {
    title: 'Les AESH',
    description:
      "Les AESH accompagnent les élèves qui ont besoin d'une aide particulière pour suivre leur scolarité (2 AESH pour 3 élèves, affectées via le PIAL). Elles les aident à comprendre les consignes, à participer aux activités de la classe et à gagner en autonomie, en lien étroit avec les enseignants.",
  },
  {
    title: 'Les ASEM',
    description:
      "Les ASEM travaillent auprès des plus petits, principalement en maternelle. Elles aident les enfants à s'habiller, à aller aux toilettes et à gagner en autonomie dans les gestes du quotidien. Elles participent aussi aux activités en classe, préparent le matériel et accompagnent les enseignants tout au long de la journée. Elles sont toutes salariées de l'OGEC.",
  },
  {
    title: "L'APEL",
    description:
      "L'APEL rassemble les parents qui souhaitent s'investir dans la vie de l'école et représenter les familles. Ils organisent des événements et des ventes, comme la vente de sapins de Noël, tout au long de l'année. L'argent récolté permet de financer des sorties, des activités et du matériel pour les élèves.",
  },
  {
    title: "L'OGEC",
    description:
      "L'OGEC s'occupe de tout ce qui permet à l'école de fonctionner en dehors de la classe. Il gère le budget (notamment le forfait communal), les bâtiments, leur entretien et emploie le personnel non enseignant. C'est grâce à lui que les locaux sont entretenus et que l'école dispose des moyens matériels nécessaires à son fonctionnement.",
  },
];

const INSTANCES = [
  {
    name: 'Conseil des maîtres',
    detail: "Réunit la cheffe d'établissement et l'équipe enseignante pour l'organisation pédagogique de l'école et le projet d'école.",
  },
  {
    name: 'Conseils de cycle',
    detail: 'Assurent la continuité des apprentissages entre classes (Cycles 1, 2 et 3) et la liaison CM2-6e avec le collège Saint-Pierre.',
  },
  {
    name: "Conseil d'établissement",
    detail: "Instance de dialogue réunissant la cheffe d'établissement, des enseignants, l'APEL, l'OGEC et des représentants de la communauté éducative.",
  },
  {
    name: 'Équipes éducatives et ESS',
    detail: "Rassemblent la cheffe d'établissement, l'enseignant, les parents et les partenaires (AESH, enseignant référent) autour des besoins particuliers d'un élève.",
  },
];

export const ActorsPage: React.FC<ActorsPageProps> = ({ stepNumber, totalSteps, onPrev, onNext }) => {
  return (
    <div className="actors-inner">
      <header className="actors-header">
        <div>
          <h2 className="actors-title">Les acteurs et instances de l'école</h2>
          <p className="actors-subtitle">École Sainte-Anne de Pordic</p>
        </div>
        <span className="col-step-badge actors-step-badge">
          {stepNumber} / {totalSteps}
        </span>
      </header>

      <div className="actors-grid">
        {ACTORS.map((actor) => (
          <article className="actor-entry" key={actor.title}>
            <h3 className="actor-name">{actor.title}</h3>
            <p className="actor-desc">{actor.description}</p>
          </article>
        ))}
      </div>

      <section className="actors-instances">
        <h3 className="actors-instances-heading">Instances de concertation</h3>
        <div className="actors-instances-grid">
          {INSTANCES.map((inst) => (
            <div className="actor-instance-item" key={inst.name}>
              <span className="actor-instance-name">{inst.name}</span>
              <p className="actor-instance-desc">{inst.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="actors-footer">
        <button type="button" className="step-nav-btn" onClick={onPrev}>
          <ChevronUp size={15} /> Précédent
        </button>
        <button type="button" className="step-nav-btn primary" onClick={onNext}>
          Suivant <ChevronDown size={15} />
        </button>
      </footer>
    </div>
  );
};
