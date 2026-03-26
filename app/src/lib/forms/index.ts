export { getForm, registerForm, listForms } from "./registry";
export { registerFieldRenderer, getFieldRenderer } from "./fieldRegistry";

// Side-effect imports: each file self-registers its form definitions
import "./createProject";
import "./projectForms";
import "./proposalForms";
import "./seedPackForms";
import "./sessionForms";
import "./settingsForms";
