import React, { useState } from 'react';
import { 
  usePopulateTestData, 
  useGetPassengers, 
  useGetPassengerStats,
  useImportPassengersFromCSV 
} from '../lib/hooks';

export function PassengersDemo() {
  const [csvContent, setCsvContent] = useState('');
  const [filters, setFilters] = useState({
    flightNumber: '',
    departureCity: '',
    arrivalCity: '',
    ticketClass: '',
    status: '',
    limit: 0
  });

  const populateTestData = usePopulateTestData();
  const { data: passengersData, isLoading: passengersLoading } = useGetPassengers(filters);
  const { data: statsData, isLoading: statsLoading } = useGetPassengerStats();
  const importCSV = useImportPassengersFromCSV();

  const handleFilterChange = (field: string, value: string | number) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePopulateTestData = () => {
    populateTestData.mutate();
  };

  const handleImportCSV = () => {
    if (csvContent.trim()) {
      importCSV.mutate(csvContent);
      setCsvContent('');
    }
  };

  const clearFilters = () => {
    setFilters({
      flightNumber: '',
      departureCity: '',
      arrivalCity: '',
      ticketClass: '',
      status: '',
      limit: 0
    });
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Airlines Passenger Management</h1>
      
      {/* Populate Test Data Section */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">1. Populate Test Data</h2>
        <p className="text-gray-600 mb-4">
          Click the button below to populate the database with sample passenger data.
        </p>
        <button
          onClick={handlePopulateTestData}
          disabled={populateTestData.isPending}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {populateTestData.isPending ? 'Populating...' : 'Populate Test Data'}
        </button>
        {populateTestData.isSuccess && (
          <p className="text-green-600 mt-2">{populateTestData.data?.message}</p>
        )}
        {populateTestData.isError && (
          <p className="text-red-600 mt-2">Error: {populateTestData.error?.message}</p>
        )}
      </div>

      {/* Filters Section */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">2. Filter Passengers</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Flight Number
            </label>
            <input
              type="text"
              value={filters.flightNumber}
              onChange={(e) => handleFilterChange('flightNumber', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., LA1234"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Departure City
            </label>
            <input
              type="text"
              value={filters.departureCity}
              onChange={(e) => handleFilterChange('departureCity', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., São Paulo"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Arrival City
            </label>
            <input
              type="text"
              value={filters.arrivalCity}
              onChange={(e) => handleFilterChange('arrivalCity', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Los Angeles"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ticket Class
            </label>
            <select
              value={filters.ticketClass}
              onChange={(e) => handleFilterChange('ticketClass', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Classes</option>
              <option value="economy">Economy</option>
              <option value="business">Business</option>
              <option value="first">First</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="confirmed">Confirmed</option>
              <option value="pending">Pending</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Limit Results
            </label>
            <input
              type="number"
              value={filters.limit || ''}
              onChange={(e) => handleFilterChange('limit', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0 = no limit"
              min="0"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={clearFilters}
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Passengers List Section */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">3. Passengers List</h2>
        {passengersLoading ? (
          <p className="text-gray-600">Loading passengers...</p>
        ) : passengersData ? (
          <div>
            <p className="text-gray-600 mb-4">
              {passengersData.message} (Showing {passengersData.totalCount} passengers)
            </p>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Flight
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Route
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Class
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {passengersData.passengers.map((passenger) => (
                    <tr key={passenger.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {passenger.firstName} {passenger.lastName}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {passenger.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {passenger.flightNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {passenger.departureCity} → {passenger.arrivalCity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {passenger.ticketClass || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          passenger.status === 'confirmed' 
                            ? 'bg-green-100 text-green-800'
                            : passenger.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {passenger.status || 'N/A'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <p className="text-gray-600">No passengers data available. Try populating test data first.</p>
        )}
      </div>

      {/* Statistics Section */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">4. Passenger Statistics</h2>
        {statsLoading ? (
          <p className="text-gray-600">Loading statistics...</p>
        ) : statsData ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-900">Total Passengers</h3>
              <p className="text-3xl font-bold text-blue-600">{statsData.totalPassengers}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-green-900">Average Price</h3>
              <p className="text-3xl font-bold text-green-600">R$ {statsData.averagePrice}</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-purple-900">By Ticket Class</h3>
              <div className="space-y-1">
                {Object.entries(statsData.byTicketClass).map(([className, count]) => (
                  <div key={className} className="flex justify-between">
                    <span className="text-sm text-purple-700 capitalize">{className}:</span>
                    <span className="font-semibold text-purple-900">{count}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-orange-900">By Status</h3>
              <div className="space-y-1">
                {Object.entries(statsData.byStatus).map(([status, count]) => (
                  <div key={status} className="flex justify-between">
                    <span className="text-sm text-orange-700 capitalize">{status}:</span>
                    <span className="font-semibold text-orange-900">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-gray-600">No statistics available. Try populating test data first.</p>
        )}
      </div>

      {/* CSV Import Section */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">5. Import CSV Data</h2>
        <p className="text-gray-600 mb-4">
          Paste CSV content below to import additional passenger data. Make sure to include the header row.
        </p>
        <textarea
          value={csvContent}
          onChange={(e) => setCsvContent(e.target.value)}
          className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
          placeholder="firstName,lastName,email,flightNumber,departureCity,arrivalCity,departureDate,ticketClass,price,status&#10;João,Silva,joao@email.com,BR123,São Paulo,Rio de Janeiro,2024-02-01,economy,1500.00,confirmed"
        />
        <div className="mt-4">
          <button
            onClick={handleImportCSV}
            disabled={!csvContent.trim() || importCSV.isPending}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
          >
            {importCSV.isPending ? 'Importing...' : 'Import CSV'}
          </button>
        </div>
        {importCSV.isSuccess && (
          <p className="text-green-600 mt-2">{importCSV.data?.message}</p>
        )}
        {importCSV.isError && (
          <p className="text-red-600 mt-2">Error: {importCSV.error?.message}</p>
        )}
      </div>
    </div>
  );
}
