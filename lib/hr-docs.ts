// HR Documents: the folders that belong to People & HR. Files in these folders are kept out of the
// general Company Documents page and only Admin and HR Team can see, edit or send them.
export const HR_FOLDERS = ['Payslips', 'HR Forms', 'HR Contracts', 'Employee Records']
export const isHrFolder = (f: any) => HR_FOLDERS.includes(String(f || ''))

// Ready-made NOVOURQ templates, shipped with the portal, that "Add NOVOURQ templates" puts in the library.
export const HR_STARTERS = [
  { name: 'Payslip template (fillable)', folder: 'Payslips', path: '/hr-templates/Payslip_Template_NOVOURQ.pdf', mime: 'application/pdf' },
  { name: 'Proof of employment letter (fillable)', folder: 'HR Forms', path: '/hr-templates/Proof_of_Employment_NOVOURQ_Template.pdf', mime: 'application/pdf' },
]
