import { createRoute, Link, type RootRoute } from "@tanstack/react-router";
import { PassengersDemo } from "@/components/passengers-demo";

function PassengersDemoPage() {
  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src="/logo.png"
                alt="Deco"
                className="w-8 h-8 object-contain"
              />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  Airlines MCP Server
                </h1>
                <p className="text-sm text-gray-500">
                  Passenger Management Demo
                </p>
              </div>
            </div>
            
            <Link
              to="/"
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <PassengersDemo />
    </div>
  );
}

export default (parentRoute: RootRoute) =>
  createRoute({
    path: "/passengers-demo",
    component: PassengersDemoPage,
    getParentRoute: () => parentRoute,
  });
