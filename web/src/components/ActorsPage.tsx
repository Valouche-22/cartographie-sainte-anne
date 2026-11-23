import React from 'react';
import {
  Baby,
  BookOpen,
  Briefcase,
  Building2,
  ChevronDown,
  ChevronUp,
  HeartHandshake,
  Users,
} from 'lucide-react';

interface ActorsPageProps {
  stepNumber: number;
  totalSteps: number;
  onPrev: () => void;
  onNext: () => void;
}

const ACTORS = [
  {
    title: 'La directrice',
    role: 'Direction et organisation',
    icon: Briefcase,
    description:
      "Elle dirige l'établissement, veille au bon fonctionnement de l'école et coordonne l'équipe au quotidien. À l'école Sainte-Anne, elle est également enseignante à mi-temps et assure le lien avec les familles, la tutelle et la commune.",
  },
  {
    title: 'Les enseignants',
    role: '11 professeurs des écoles',
    icon: BookOpen,
    description:
      'Ils préparent et conduisent les apprentissages de la toute petite section au CM2 selon les programmes officiels. Ils suivent les progrès de chaque élève, adaptent leurs séances et échangent régulièrement avec les parents.',
  },
  {
    title: 'Les AESH',
    role: 'Accompagnement individuel',
    icon: HeartHandshake,
    description:
      "Les accompagnants d'élèves en situation de handicap interviennent en classe auprès d'élèves à besoins particuliers. Ils les aident à suivre les activités et à gagner en autonomie, en lien avec l'enseignant (2 AESH pour 3 élèves).",
  },
  {
    title: 'Les ASEM',
    role: 'Agents spécialisés en maternelle',
    icon: Baby,
    description:
      "Dans l'enseignement privé, les ASEM travaillent en binôme avec les enseignants de maternelle. Elles accompagnent les plus jeunes dans les gestes du quotidien (habillage, toilettes, sieste), préparent le matériel des ateliers et entretiennent les salles.",
  },
  {
    title: "L'APEL",
    role: "Association des parents d'élèves",
    icon: Users,
    description:
      "Association de parents bénévoles qui représente les familles et anime la vie de l'école. Elle organise des événements et des actions au fil de l'année pour financer les sorties scolaires, les spectacles et du matériel pédagogique.",
  },
  {
    title: "L'OGEC",
    role: 'Organisme de gestion',
    icon: Building2,
    description:
      "Association bénévole chargée de la gestion financière, matérielle et immobilière de l'établissement. Elle gère le budget, veille à l'entretien des bâtiments et emploie les personnels non enseignants, notamment les ASEM.",
  },
];

export const ActorsPage: React.FC<ActorsPageProps> = ({ stepNumber, totalSteps, onPrev, onNext }) => {
  return (
    <div className="actors-inner">
      <header className="actors-header">
        <div>
          <h2 className="actors-title">Les acteurs de l'école</h2>
          <p className="actors-subtitle">Les différents rôles au sein de l'école Sainte-Anne de Pordic</p>
        </div>
        <span className="col-step-badge actors-step-badge">
          {stepNumber} / {totalSteps}
        </span>
      </header>

      <div className="actors-grid">
        {ACTORS.map((actor) => {
          const Icon = actor.icon;
          return (
            <article className="actor-card" key={actor.title}>
              <div className="actor-card-top">
                <div className="actor-icon-wrap" aria-hidden="true">
                  <Icon size={18} strokeWidth={1.75} />
                </div>
                <div className="actor-heading">
                  <h3 className="actor-name">{actor.title}</h3>
                  <span className="actor-role">{actor.role}</span>
                </div>
              </div>
              <p className="actor-desc">{actor.description}</p>
            </article>
          );
        })}
      </div>

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
