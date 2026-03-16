export const questions = [
  {
    id: 'budget',
    question: 'What is your budget range?',
    type: 'select',
    options: [
      { value: 'budget', label: 'Budget ($500 - $800)' },
      { value: 'mid', label: 'Mid-Range ($800 - $1500)' },
      { value: 'high', label: 'High-End ($1500 - $3000)' },
      { value: 'enthusiast', label: 'Enthusiast ($3000+)' }
    ]
  },
  {
    id: 'usage',
    question: 'What will you primarily use this PC for?',
    type: 'select',
    options: [
      { value: 'gaming', label: 'Gaming' },
      { value: 'work', label: 'Work/Productivity' },
      { value: 'content', label: 'Content Creation' },
      { value: 'general', label: 'General Use' }
    ]
  },
  {
    id: 'gpu_priority',
    question: 'How important is graphics performance?',
    type: 'select',
    options: [
      { value: 'critical', label: 'Critical (Gaming/3D Work)' },
      { value: 'important', label: 'Important' },
      { value: 'moderate', label: 'Moderate' },
      { value: 'low', label: 'Low (Integrated is fine)' }
    ]
  },
  {
    id: 'cpu_brand',
    question: 'Do you have a CPU brand preference?',
    type: 'select',
    options: [
      { value: 'none', label: 'No Preference' },
      { value: 'intel', label: 'Intel' },
      { value: 'amd', label: 'AMD' }
    ]
  }
];

