// Helper utility to add to each controller
export const getStringParam = (param: string | string[] | undefined): string | undefined => {
  return Array.isArray(param) ? param[0] : param;
};

export const getNumberParam = (param: string | string[] | undefined, defaultValue: number): number => {
  const str = Array.isArray(param) ? param[0] : param;
  const num = parseInt(str || String(defaultValue), 10);
  return isNaN(num) ? defaultValue : num;
};
