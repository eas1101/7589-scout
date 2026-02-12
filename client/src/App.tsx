import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import TeamsPage from "@/pages/TeamsPage";
import MatchesPage from "@/pages/MatchesPage";
import AnalyticsPage from "@/pages/AnalyticsPage";
import ComparePage from "@/pages/ComparePage";
import SettingsPage from "@/pages/SettingsPage";
import HomeRedirect from "@/pages/HomeRedirect";
import HashRouterBridge from "@/pages/HashRouterBridge";

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomeRedirect} />
      <Route path="/teams" component={TeamsPage} />
      <Route path="/matches" component={MatchesPage} />
      <Route path="/analytics" component={AnalyticsPage} />
      <Route path="/compare" component={ComparePage} />
      <Route path="/settings" component={SettingsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <HashRouterBridge>
          <Router />
        </HashRouterBridge>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
