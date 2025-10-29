export default function Logo() {
  return (
    <div className="relative">
      <span className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-linear-to-r from-indigo-500 via-blue-500 to-cyan-400 dark:from-indigo-400 dark:via-blue-400 dark:to-cyan-300 bg-clip-text text-transparent animate-gradient-x group-hover:scale-[1.02] transition-transform duration-300 ease-out">
        DevProjects
      </span>
      <span className="hidden sm:inline-block text-3xl font-extrabold tracking-tight bg-linear-to-r from-cyan-400 to-emerald-400 dark:from-cyan-300 dark:to-emerald-300 bg-clip-text text-transparent group-hover:scale-[1.02] transition-transform duration-300 ease-out">.ai</span>
      <div className="absolute -bottom-0.5 left-0 right-0 h-px bg-linear-to-r from-transparent via-blue-500/50 to-transparent dark:via-blue-400/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-in-out"></div>
      {/* Glow effect container */}
      <div className="absolute -inset-1 bg-linear-to-r from-indigo-500/0 via-blue-500/10 to-cyan-400/0 dark:from-indigo-400/0 dark:via-blue-400/10 dark:to-cyan-300/0 rounded-lg blur-lg group-hover:blur-xl transition-all duration-300 opacity-0 group-hover:opacity-100"></div>
      {/* Dark mode extra glow */}
      <div className="absolute -inset-1 dark:bg-linear-to-r dark:from-indigo-400/0 dark:via-blue-400/7.5 dark:to-cyan-300/0 rounded-lg dark:blur-2xl transition-all duration-300 opacity-0 group-hover:opacity-100"></div>
    </div>
  );
}
